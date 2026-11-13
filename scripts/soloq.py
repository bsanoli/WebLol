"""Coleta partidas de SoloQ dos pros na API da Riot e gera os dados da aba SoloQ.

Uso (a chave fica no ambiente, nunca no repositório):
    RIOT_API_KEY=RGAPI-... python3 scripts/soloq.py          # coleta + gera os dados
    python3 scripts/soloq.py --only-build                     # só gera os dados a partir do cache

Etapas:
1. Lê scripts/soloq-pros.json (pros, contas e janela de dias).
2. Resolve cada Riot ID (account-v1), lista as partidas ranqueadas solo/duo (fila 420) dos
   últimos `days` dias (match-v5) e baixa partida + timeline das que ainda não estão no cache.
3. Guarda as partidas normalizadas em src/data/soloq/matches.json (cache; partidas mais antigas
   que a janela saem do arquivo).
4. Gera src/data/soloq/{summary,builds,build-assets,build-timeline,drafts}.json no mesmo formato
   dos dados do Worlds, para a aba SoloQ reaproveitar os componentes das Builds.

Só os jogadores da lista entram nas builds. Os outros participantes ficam como `ref` (adversário direto).
Limites da chave pessoal/dev: 20 req/s e 100 req/2 min; o script espera entre as chamadas.
"""
import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
OUT = DATA / "soloq"
CONFIG = ROOT / "scripts" / "soloq-pros.json"
CACHE = OUT / "matches.json"
DDRAGON = "https://ddragon.leagueoflegends.com"

ROUTING = {  # plataforma -> (região do match-v5, região do account-v1, rótulo)
    "kr": ("asia", "asia", "KR"), "jp1": ("asia", "asia", "JP"),
    "euw1": ("europe", "europe", "EUW"), "eun1": ("europe", "europe", "EUNE"),
    "tr1": ("europe", "europe", "TR"), "ru": ("europe", "europe", "RU"),
    "na1": ("americas", "americas", "NA"), "br1": ("americas", "americas", "BR"),
    "la1": ("americas", "americas", "LAN"), "la2": ("americas", "americas", "LAS"),
    "oc1": ("sea", "asia", "OCE"), "vn2": ("sea", "asia", "VN"), "tw2": ("sea", "asia", "TW"),
    "sg2": ("sea", "asia", "SG"),
}
GRAPHS = {"kr": "kr", "jp1": "jp", "euw1": "euw", "eun1": "eune", "tr1": "tr", "ru": "ru", "na1": "na",
          "br1": "br", "la1": "lan", "la2": "las", "oc1": "oce", "vn2": "vn", "tw2": "tw", "sg2": "sg"}
ROLES = {"TOP": "Top", "JUNGLE": "Jungle", "MIDDLE": "Mid", "BOTTOM": "ADC", "UTILITY": "Suporte"}
SPELLS = {1: "SummonerBoost", 3: "SummonerExhaust", 4: "SummonerFlash", 6: "SummonerHaste", 7: "SummonerHeal",
          11: "SummonerSmite", 12: "SummonerTeleport", 13: "SummonerMana", 14: "SummonerDot",
          21: "SummonerBarrier", 32: "SummonerSnowball"}
SLOTS = {1: "Q", 2: "W", 3: "E", 4: "R"}
TRINKETS = {3340, 3364, 3363}
SOLO_QUEUE = 420


# ---------------------------------------------------------------- Riot API

class Riot:
    def __init__(self, key):
        self.key = key
        self.last = defaultdict(float)
        self.locks = defaultdict(threading.Lock)
        self.calls = 0

    def get(self, host, path, params=None):
        url = f"https://{host}.api.riotgames.com{path}"
        if params:
            url += "?" + urllib.parse.urlencode(params)
        for attempt in range(6):
            with self.locks[host]:  # 100 chamadas / 2 min por região de roteamento
                wait = self.last[host] + 1.25 - time.monotonic()
                if wait > 0:
                    time.sleep(wait)
                self.last[host] = time.monotonic()
            self.calls += 1
            request = urllib.request.Request(url, headers={"X-Riot-Token": self.key, "User-Agent": "weblol-soloq"})
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    return json.load(response)
            except urllib.error.HTTPError as error:
                if error.code == 404:
                    return None
                if error.code in (401, 403):
                    sys.exit(f"A API da Riot recusou a chave ({error.code}). Confira se o segredo RIOT_API_KEY é válido.")
                if error.code == 429 or error.code >= 500:
                    time.sleep(int(error.headers.get("Retry-After") or 5 * (attempt + 1)))
                    continue
                raise
            except urllib.error.URLError:
                time.sleep(5 * (attempt + 1))
        raise RuntimeError(f"Falha repetida em {url}")


def fetch_json(url):
    request = urllib.request.Request(url, headers={"User-Agent": "weblol-soloq"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


# ---------------------------------------------------------------- Data Dragon

def load_ddragon():
    version = fetch_json(f"{DDRAGON}/api/versions.json")[0]
    base = f"{DDRAGON}/cdn/{version}/data"
    return {
        "version": version,
        "champions": fetch_json(f"{base}/en_US/champion.json")["data"],
        "items": fetch_json(f"{base}/pt_BR/item.json")["data"],
        "runes_pt": fetch_json(f"{base}/pt_BR/runesReforged.json"),
        "runes_en": fetch_json(f"{base}/en_US/runesReforged.json"),
        "base": base,
    }


# ---------------------------------------------------------------- coleta

def item_events(events, participant):
    """Compras por minuto ([minuto, [ids]]; id negativo = venda), desfazendo ITEM_UNDO."""
    log = []
    for event in events:
        if event.get("participantId") != participant:
            continue
        kind = event["type"]
        minute = event["timestamp"] // 60000
        if kind == "ITEM_PURCHASED":
            log.append((minute, event["itemId"]))
        elif kind == "ITEM_SOLD":
            log.append((minute, -event["itemId"]))
        elif kind == "ITEM_UNDO":
            before, after = event.get("beforeId", 0), event.get("afterId", 0)
            target = before if before else -after
            for index in range(len(log) - 1, -1, -1):
                if log[index][1] == target:
                    del log[index]
                    break
    grouped = []
    for minute, item in log:
        if grouped and grouped[-1][0] == minute:
            grouped[-1][1].append(item)
        else:
            grouped.append([minute, [item]])
    return grouped


def normalize(match, timeline, pros_by_puuid, champions_by_key, platform):
    info = match["info"]
    events = [event for frame in timeline["info"]["frames"] for event in frame["events"]]
    ids = {p["puuid"]: p["participantId"] for p in timeline["info"]["participants"]}
    winner = next((("blue" if t["teamId"] == 100 else "red") for t in info["teams"] if t["win"]), "")
    bans = sorted({champions_by_key[b["championId"]] for t in info["teams"] for b in t.get("bans", [])
                   if b["championId"] in champions_by_key})
    players = []
    for p in info["participants"]:
        name = champions_by_key.get(p["championId"], p["championName"])
        role = ROLES.get(p.get("teamPosition") or p.get("individualPosition"), "")
        side = "blue" if p["teamId"] == 100 else "red"
        pro = pros_by_puuid.get(p["puuid"])
        if not pro:
            players.append({"champion": name, "role": role, "side": side, "ref": True})
            continue
        participant = ids.get(p["puuid"], p["participantId"])
        styles = p["perks"]["styles"]
        primary = next(s for s in styles if s["description"] == "primaryStyle")
        secondary = next(s for s in styles if s["description"] == "subStyle")
        stats = p["perks"]["statPerks"]
        skills = "".join(SLOTS[e["skillSlot"]] for e in events
                         if e["type"] == "SKILL_LEVEL_UP" and e.get("participantId") == participant
                         and e.get("levelUpType", "NORMAL") == "NORMAL" and e.get("skillSlot") in SLOTS)
        players.append({
            "player": pro["name"], "team": pro["team"], "champion": name, "role": role or pro["role"], "side": side,
            "kda": [p["kills"], p["deaths"], p["assists"]],
            "cs": p["totalMinionsKilled"] + p["neutralMinionsKilled"],
            "spells": [SPELLS.get(p["summoner1Id"], str(p["summoner1Id"])), SPELLS.get(p["summoner2Id"], str(p["summoner2Id"]))],
            "finalItems": [p[f"item{i}"] for i in range(7) if p[f"item{i}"]],
            "primaryTree": primary["style"], "primaryRunes": [s["perk"] for s in primary["selections"]],
            "secondaryTree": secondary["style"], "secondaryRunes": [s["perk"] for s in secondary["selections"]],
            "shards": [stats["offense"], stats["flex"], stats["defense"]],
            "skillOrder": skills,
            "itemEventsByMinute": item_events(events, participant),
        })
    return {
        "id": match["metadata"]["matchId"], "platform": platform,
        "date": datetime.fromtimestamp(info["gameCreation"] / 1000, timezone.utc).strftime("%Y-%m-%d"),
        "created": info["gameCreation"], "patch": ".".join(info["gameVersion"].split(".")[:2]),
        "duration": info["gameDuration"], "winner": winner, "bans": bans, "players": players,
    }


def collect(config, cache, ddragon, key):
    """Cada região de roteamento (asia, americas, europe...) tem seu próprio limite, então roda em paralelo.
    SOLOQ_MINUTES limita o tempo de download; o que faltar entra na próxima execução."""
    riot = Riot(key)
    deadline = time.monotonic() + float(os.environ.get("SOLOQ_MINUTES", "100")) * 60
    champions_by_key = {int(c["key"]): c["name"] for c in ddragon["champions"].values()}
    days = config.get("days", 14)
    per_account = config.get("maxGamesPerAccount", 20)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pros_by_puuid, wanted, missing = {}, {}, []

    def lookup(entry):
        pro, account = entry
        platform = account["platform"]
        match_region, account_region, _ = ROUTING[platform]
        name, tag = account["riotId"].rsplit("#", 1)
        found = riot.get(account_region, f"/riot/account/v1/accounts/by-riot-id/{urllib.parse.quote(name)}/{urllib.parse.quote(tag)}")
        if not found:
            missing.append(f'{pro["name"]}: {account["riotId"]}')
            return
        pros_by_puuid[found["puuid"]] = pro
        ids = riot.get(match_region, f'/lol/match/v5/matches/by-puuid/{found["puuid"]}/ids',
                       {"queue": SOLO_QUEUE, "startTime": int(since.timestamp()), "count": min(per_account, 100)}) or []
        for match_id in ids:
            wanted[match_id] = (platform, match_region)

    accounts = [(pro, account) for pro in config["pros"] for account in pro["accounts"]]
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lookup, accounts))

    by_region = defaultdict(list)
    for match_id, (platform, region) in wanted.items():
        if match_id not in cache:
            by_region[region].append((match_id, platform))
    added, pending = Counter(), Counter()

    def download(region):
        for index, (match_id, platform) in enumerate(by_region[region]):
            if time.monotonic() > deadline:
                pending[region] = len(by_region[region]) - index
                return
            match = riot.get(region, f"/lol/match/v5/matches/{match_id}")
            timeline = riot.get(region, f"/lol/match/v5/matches/{match_id}/timeline")
            if not match or not timeline or match["info"].get("queueId") != SOLO_QUEUE:
                continue
            if match["info"]["gameDuration"] < 300:  # remake
                continue
            cache[match_id] = normalize(match, timeline, pros_by_puuid, champions_by_key, platform)
            added[region] += 1

    with ThreadPoolExecutor(max_workers=len(by_region) or 1) as pool:
        list(pool.map(download, list(by_region)))
    cutoff = int(since.timestamp() * 1000)
    for match_id in [m for m, game in cache.items() if game["created"] < cutoff]:
        del cache[match_id]
    print(f"{riot.calls} chamadas à API · {sum(added.values())} partidas novas {dict(added)} · {len(cache)} no cache")
    if pending:
        print(f"Ficaram para a próxima execução: {dict(pending)}")
    if missing:
        print("Contas não encontradas (confira o Riot ID em scripts/soloq-pros.json):\n  " + "\n  ".join(sorted(missing)))


# ---------------------------------------------------------------- dados da aba

def frequencies(values, games):
    counts = Counter(values)
    ordered = sorted(counts.items(), key=lambda entry: (-entry[1], str(entry[0])))
    return [{"value": value, "count": count, "percent": round(count / games * 100, 1)} for value, count in ordered]


def priority(sequence, target):
    counts, reached = Counter(), []
    for skill in sequence:
        if skill == "R":
            continue
        counts[skill] += 1
        if counts[skill] == target:
            reached.append(skill)
    return reached


def aggregate(players, champion, boots):
    games = len(players)
    target = 6 if champion == "Jayce" else 5
    orders = [p["skillOrder"][:18] for p in players if p["skillOrder"]]
    priorities = [priority(order, target) for order in orders]
    first = [p[0] for p in priorities if p]
    pairs = [f"{p[0]}>{p[1]}" for p in priorities if len(p) > 1]
    starters = []
    for p in players:
        items = sorted(i for minute, bought in p["itemEventsByMinute"] if minute == 0 for i in bought if i > 0 and i not in TRINKETS)
        if items:
            starters.append(tuple(items))
    pages = [tuple([p["primaryTree"], *p["primaryRunes"], p["secondaryTree"], *sorted(p["secondaryRunes"]), *p["shards"]]) for p in players]
    page = frequencies(pages, games)[0]
    player_boots = [[i for i in dict.fromkeys(p["finalItems"]) if i in boots] for p in players]
    return {
        "games": games,
        "finalItems": frequencies([i for p in players for i in dict.fromkeys(p["finalItems"])], games),
        "boots": frequencies([i for b in player_boots for i in b], games),
        "gamesWithoutFinalBoots": sum(1 for b in player_boots if not b),
        "primaryTrees": frequencies([p["primaryTree"] for p in players], games),
        "secondaryTrees": frequencies([p["secondaryTree"] for p in players], games),
        "primaryRunes": [frequencies([p["primaryRunes"][slot] for p in players], games) for slot in range(4)],
        "secondaryRunes": frequencies([r for p in players for r in dict.fromkeys(p["secondaryRunes"])], games),
        "shards": [frequencies([p["shards"][slot] for p in players], games) for slot in range(3)],
        "spells": frequencies(["+".join(sorted(p["spells"])) for p in players], games),
        "skillOrder": {
            "first": frequencies([o[0] for o in orders], len(orders)) if orders else [],
            "firstThree": frequencies([o[:3] for o in orders], len(orders)) if orders else [],
            "observedSequences": frequencies(orders, games),
            "priority": {
                "pointsToMax": target,
                "first": frequencies(first, len(first)) if first else [],
                "firstAndSecond": frequencies(pairs, len(pairs)) if pairs else [],
            } if first else None,
        },
        "runePage": {**page, "value": list(page["value"])},
        "starterItems": [{**entry, "value": list(entry["value"])} for entry in frequencies(starters, games)],
    }


def lane_sample(entries):
    n = len(entries)
    return {
        "picks": n, "n": n, "w": sum(1 for _, p, won in entries if won),
        "k": round(sum(p["kda"][0] for _, p, _ in entries) / n, 2),
        "d": round(sum(p["kda"][1] for _, p, _ in entries) / n, 2),
        "a": round(sum(p["kda"][2] for _, p, _ in entries) / n, 2),
        "players": [list(e) for e in Counter(p["player"] for _, p, _ in entries).most_common(6)],
        "teams": [list(e) for e in Counter(p["team"] for _, p, _ in entries).most_common(4)],
    }


def build_dataset(cache, config, ddragon):
    OUT.mkdir(parents=True, exist_ok=True)
    games = sorted(cache.values(), key=lambda g: -g["created"])
    worlds_builds = json.loads((DATA / "worlds-2026-builds.json").read_text(encoding="utf-8"))
    worlds_assets = json.loads((DATA / "worlds-2026-build-assets.json").read_text(encoding="utf-8"))
    lol = json.loads((DATA / "lol.json").read_text(encoding="utf-8"))

    item_names = dict(worlds_builds["itemNames"])
    rune_names = dict(worlds_builds["runeNames"])
    rune_assets = dict(worlds_assets["runes"])
    completed = set(worlds_assets["completedItems"])
    abilities = dict(worlds_assets["abilities"])
    boots = {e["value"] for lanes in worlds_builds["champions"].values() for b in lanes.values() for e in b["boots"]} - {1001}
    if ddragon:
        for key, item in ddragon["items"].items():
            item_names[key] = item["name"]
            if "Boots" in item.get("tags", []) and key != "1001":
                boots.add(int(key))
            elif (not item.get("into") and item.get("from") and item["gold"].get("purchasable")
                  and item["gold"].get("total", 0) >= 2000 and item.get("maps", {}).get("11")
                  and "Consumable" not in item.get("tags", [])):
                completed.add(int(key))
        for tree_pt, tree_en in zip(ddragon["runes_pt"], ddragon["runes_en"]):
            rune_names[str(tree_pt["id"])] = tree_pt["name"]
            for slot_pt, slot_en in zip(tree_pt["slots"], tree_en["slots"]):
                for rune_pt, rune_en in zip(slot_pt["runes"], slot_en["runes"]):
                    rune_names[str(rune_pt["id"])] = rune_pt["name"]
                    key = rune_en["key"].lower()
                    rune_assets.setdefault(str(rune_pt["id"]), [key if key in lol["rune"] else None, rune_pt["icon"]])
        played = {p["champion"] for g in games for p in g["players"] if not p.get("ref")}
        by_name = {c["name"]: c["id"] for c in ddragon["champions"].values()}
        for name in sorted(played - abilities.keys()):
            if name not in by_name:
                continue
            data = fetch_json(f'{ddragon["base"]}/pt_BR/champion/{by_name[name]}.json')["data"][by_name[name]]
            entry = {"P": {"name": data["passive"]["name"], "description": data["passive"]["description"],
                           "icon": data["passive"]["image"]["full"]}}
            for slot, spell in zip("QWER", data["spells"]):
                entry[slot] = {"name": spell["name"], "description": spell["description"], "icon": spell["image"]["full"]}
            abilities[name] = entry

    # Jogadores dos pros (+ referências) com resultado
    entries = defaultdict(list)  # (campeão, rota) -> [(jogo, jogador, venceu)]
    champs = {}
    matchups = defaultdict(lambda: defaultdict(Counter))
    for game in games:
        for name in game["bans"]:
            champs.setdefault(name, {"bans": 0})["bans"] += 1
        for p in game["players"]:
            if p.get("ref") or not p["role"]:
                continue
            won = p["side"] == game["winner"]
            entries[(p["champion"], p["role"])].append((game, p, won))
            opponent = next((o for o in game["players"] if o["role"] == p["role"] and o["side"] != p["side"]), None)
            if opponent:
                record = matchups[p["role"]][p["champion"]]
                record[(opponent["champion"], "g")] += 1
                record[(opponent["champion"], "w")] += won

    by_champion = defaultdict(dict)
    for (champion, role), rows in entries.items():
        by_champion[champion][role] = rows
    summary_champs, build_champions = [], {}
    for name in sorted(set(by_champion) | set(champs)):
        lanes = by_champion.get(name, {})
        rows = [row for lane in lanes.values() for row in lane]
        main = max(lanes, key=lambda lane: len(lanes[lane])) if lanes else ""
        summary_champs.append({
            "name": name, "main": main, "picks": len(rows), "wins": sum(1 for *_, won in rows if won),
            "bans": champs.get(name, {}).get("bans", 0),
            "lanes": {lane: lane_sample(lane_rows) for lane, lane_rows in lanes.items()},
        })
        if rows:
            build_champions[name] = {"all": aggregate([p for _, p, _ in rows], name, boots),
                                     **{lane: aggregate([p for _, p, _ in lane_rows], name, boots) for lane, lane_rows in lanes.items()}}

    summary_matchups = {
        role: {champion: sorted(([opp, record[(opp, "g")], record[(opp, "w")]] for opp in {o for o, k in record if k == "g"}),
                                key=lambda row: -row[1])
               for champion, record in champions.items()}
        for role, champions in matchups.items()
    }
    regions = sorted({ROUTING[g["platform"]][2] for g in games})
    patches = Counter(g["patch"] for g in games)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    write("summary.json", {
        "meta": {"asOf": now if games else None, "regions": regions, "pros": len(config["pros"]), "days": config.get("days", 14)},
        "games": len(games), "mgames": [], "comps": [], "players": [],
        "champs": summary_champs, "matchups": summary_matchups,
    })

    def lean(p, keep_events):
        if p.get("ref"):
            return p
        events = p["itemEventsByMinute"] if keep_events else [e for e in p["itemEventsByMinute"] if e[0] == 0]
        return {**{k: v for k, v in p.items() if k != "itemEventsByMinute"}, "itemEventsByMinute": events}

    def source(game):
        return f'https://www.leagueofgraphs.com/match/{GRAPHS[game["platform"]]}/{game["id"].split("_", 1)[1]}'

    write("builds.json", {
        "asOf": now[:10], "patch": patches.most_common(1)[0][0] if patches else "",
        "gameCount": len(games), "itemNames": item_names, "runeNames": rune_names,
        "games": [{"id": g["id"], "date": g["date"], "players": [lean(p, False) for p in g["players"]]} for g in games],
        "champions": build_champions,
    })
    write("build-timeline.json", {"games": [{
        "id": g["id"], "date": g["date"], "stage": "soloq", "round": ROUTING[g["platform"]][2], "number": 0,
        "buildsSource": source(g), "blue": "", "red": "", "winner": g["winner"],
        "players": [p if p.get("ref") else {k: p[k] for k in ("player", "champion", "role", "side", "kda", "itemEventsByMinute")}
                    for p in g["players"]],
    } for g in games]})
    write("build-assets.json", {"runes": rune_assets, "completedItems": sorted(completed),
                                "runeTrees": worlds_assets["runeTrees"], "abilities": abilities})
    write("drafts.json", {})
    print(f"{len(games)} partidas · {len(build_champions)} campeões com build · regiões {', '.join(regions) or '—'}")


def write(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--only-build", action="store_true", help="não chama a API da Riot; só regera os dados do cache")
    args = parser.parse_args()
    config = json.loads(CONFIG.read_text(encoding="utf-8"))
    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    try:
        ddragon = load_ddragon()
    except Exception as error:  # sem rede para o Data Dragon: usa só o catálogo do Worlds
        if not args.only_build:
            raise
        print(f"Data Dragon indisponível ({error}); usando nomes e ícones do Worlds.")
        ddragon = None
    if not args.only_build:
        key = os.environ.get("RIOT_API_KEY", "").strip()
        if not key:
            sys.exit("Defina RIOT_API_KEY com a chave da API da Riot.")
        collect(config, cache, ddragon, key)
        OUT.mkdir(parents=True, exist_ok=True)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    build_dataset(cache, config, ddragon)


if __name__ == "__main__":
    main()
