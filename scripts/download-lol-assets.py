"""Download Riot Data Dragon art used by WebLol. Requires Python and Pillow."""

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from pathlib import Path
import re
from urllib.request import urlopen

from PIL import Image

ASSETS = Path(__file__).resolve().parents[1] / "public" / "assets"
DATA = Path(__file__).resolve().parents[1] / "src" / "data"
CDN = "https://ddragon.leagueoflegends.com/cdn"
BASE, WORLDS = "15.24.1", "16.20.1"
SHARDS = {
    "Ability Haste": "CDRScaling",
    "Adaptive Force": "AdaptiveForce",
    "Attack Speed": "AttackSpeed",
    "Health": "HealthPlus",
    "Health Scaling": "HealthScaling",
    "Move Speed": "MovementSpeed",
    "Tenacity and Slow Resist": "Tenacity",
}
SHARD_NAMES = {
    "Ability Haste": "Aceleração de Habilidade",
    "Adaptive Force": "Força Adaptativa",
    "Attack Speed": "Velocidade de Ataque",
    "Health": "Vida",
    "Health Scaling": "Vida Escalável",
    "Move Speed": "Velocidade de Movimento",
    "Tenacity and Slow Resist": "Tenacidade e Resistência a Lentidão",
}


def fetch(url):
    for attempt in range(3):
        try:
            with urlopen(url, timeout=30) as response:
                return response.read()
        except OSError:
            if attempt == 2:
                raise


def catalog(version, file, locale="en_US"):
    return json.loads(fetch(f"{CDN}/{version}/data/{locale}/{file}.json"))


def key(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def add_runes(manifest, add):
    # Keep the display slots from the tournament patch. Older icons remain
    # available for historical entries whose rune no longer occupies a slot.
    for version in (WORLDS, BASE):
        trees = catalog(version, "runesReforged")
        localized_trees = catalog(version, "runesReforged", "pt_BR")
        localized = {r["id"]: r["name"] for t in localized_trees for s in t["slots"] for r in s["runes"]}
        tree_names = {t["id"]: t["name"] for t in localized_trees}
        for tree in trees:
            tree_key = tree["key"]
            if tree_key not in manifest["runeTrees"]:
                icon = tree["icon"]
                manifest["runeTrees"][tree_key] = {
                    "name": tree_names.get(tree["id"], tree["name"]),
                    "icon": add("rune", icon.rsplit("/", 1)[1], f"img/{icon}"),
                    "slots": [[key(r["name"]) for r in slot["runes"]] for slot in tree["slots"]],
                }
            for slot in tree["slots"]:
                for rune in slot["runes"]:
                    name = key(rune["name"])
                    if name in manifest["rune"]:
                        continue
                    icon = rune["icon"]
                    manifest["rune"][name] = add("rune", icon.rsplit("/", 1)[1], f"img/{icon}")
                    manifest["runeNames"][name] = localized.get(rune["id"], rune["name"])

    for name, icon in SHARDS.items():
        filename = f"StatMods{icon}Icon.png"
        manifest["rune"][key(name)] = add("rune", filename, f"img/perk-images/StatMods/{filename}")
        manifest["runeNames"][key(name)] = SHARD_NAMES[name]


def main():
    matches = json.loads((DATA / "worlds.json").read_text(encoding="utf-8"))
    builds = [c["build"] for c in matches["champs"] if c.get("build")]
    item_names = {row[2] for b in builds for k in ("items", "support", "boots") for row in b.get(k, [])}
    rune_names = ({row[2] for b in builds for row in b.get("keys", [])}
                  | {n for b in builds for row in b.get("runes_en", []) for n in row.split(", ")})
    spell_names = {n for b in builds for row in b.get("spells", []) for n in row[2].split(" and ")}
    item_keys = {key(n) for n in item_names}
    jobs = {}
    newer = {}
    manifest = {"champions": {}, "item": {}, "rune": {}, "runeNames": {},
                "runeTrees": {}, "spell": {}}

    def add(kind, filename, source, version=BASE):
        path = f"lol/{kind}/{filename}"
        jobs[path] = f"{CDN}/{source}"
        if version == WORLDS:
            newer[path] = version
        return path

    for version in (BASE, WORLDS):
        champions = catalog(version, "champion")["data"]
        for id, c in champions.items():
            if id in manifest["champions"]:
                continue
            portrait = add("champion", c["image"]["full"], f"{version}/img/champion/{c['image']['full']}", version)
            splash = add("splash", f"{id}.webp", f"img/champion/splash/{id}_0.jpg", version)
            manifest["champions"][id] = {"name": c["name"], "tags": c["tags"], "portrait": portrait, "splash": splash}

        items = catalog(version, "item")["data"]
        for id, item in sorted(items.items(), key=lambda pair: int(pair[0])):
            name = key(item["name"])
            if item["maps"].get("11") and name in item_keys and name not in manifest["item"]:
                filename = item["image"]["full"]
                manifest["item"][name] = add("item", filename, f"{version}/img/item/{filename}", version)

        for spell in catalog(version, "summoner")["data"].values():
            name = spell["name"]
            if "CLASSIC" in spell["modes"] and name in spell_names and key(name) not in manifest["spell"]:
                filename = spell["image"]["full"]
                manifest["spell"][key(name)] = add("spell", filename, f"{version}/img/spell/{filename}", version)

    add_runes(manifest, add)

    manifest["map"] = add("map", "map11.png", f"{BASE}/img/map/map11.png")
    manifest["sources"] = {"base": BASE, "worlds": newer}
    for kind, names in (("item", item_names), ("rune", rune_names), ("spell", spell_names)):
        missing = sorted(n for n in names if key(n) not in manifest[kind])
        if missing:
            raise ValueError(f"Missing {kind}: {', '.join(missing)}")

    def download(job):
        path, url = job
        try:
            data = fetch(url)
            dest = ASSETS / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            with Image.open(BytesIO(data)) as image:
                if dest.suffix == ".webp":
                    image.thumbnail((480, 284), Image.Resampling.LANCZOS)
                    image.save(dest, "WEBP", quality=78)
                else:
                    image.verify()
                    dest.write_bytes(data)
        except Exception as error:
            raise RuntimeError(f"{path}: {url}") from error

    with ThreadPoolExecutor(max_workers=16) as pool:
        list(pool.map(download, jobs.items()))
    (DATA / "lol.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Downloaded {len(jobs)} files ({len(newer)} from the Worlds patch catalog).")


if __name__ == "__main__":
    main()
