#!/usr/bin/env python3
"""Separa as partidas individuais de um arquivo de builds em um arquivo por campeão.

O arquivo de builds (`builds.json`, `worlds-2026-builds.json`) chega com `games`. Esta etapa:
- troca `games` por `opponents`, a contagem de confrontos diretos de cada campeão (por rota, e "" para todas);
- grava `<pasta>/<slug>.json` com os confrontos do campeão: o adversário direto e o jogador (sem `ref`).

O site carrega o arquivo do campeão só quando alguém escolhe um adversário (ver
src/pages/builds/model/encounters.ts). Também serve como comando: indique o arquivo de builds e a pasta.

    python3 scripts/split_build_encounters.py src/data/worlds-2026-builds.json src/data/worlds-2026-encounters
"""
import json
import re
import shutil
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path


def champion_slug(name):
    """Mesma regra de championSlug (src/entities/match/ui/display.ts)."""
    text = unicodedata.normalize("NFD", name)
    text = "".join(c for c in text if not unicodedata.category(c).startswith("M")).lower()
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", text))


def direct_opponent(players, player):
    return next((o for o in players if o["role"] == player["role"] and o["side"] != player["side"]), None)


def split_builds(builds, out_dir):
    """Devolve `builds` sem `games`, com `opponents`, e grava os arquivos por campeão em `out_dir`."""
    counts = defaultdict(lambda: defaultdict(Counter))
    encounters = defaultdict(list)
    for game in builds["games"]:
        for player in game["players"]:
            if player.get("ref"):
                continue
            opponent = direct_opponent(game["players"], player)
            if not opponent:
                continue
            for lane in ("", player["role"]):
                counts[player["champion"]][lane][opponent["champion"]] += 1
            encounters[player["champion"]].append({"opponent": opponent["champion"], "player": player})
    out_dir = Path(out_dir)
    shutil.rmtree(out_dir, ignore_errors=True)
    out_dir.mkdir(parents=True)
    for champion, entries in encounters.items():
        (out_dir / f"{champion_slug(champion)}.json").write_text(
            json.dumps(entries, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    result = {key: value for key, value in builds.items() if key != "games"}
    result["opponents"] = {
        champion: {lane: sorted(opponents.items(), key=lambda item: (-item[1], item[0])) for lane, opponents in lanes.items()}
        for champion, lanes in sorted(counts.items())
    }
    return result


if __name__ == "__main__":
    source, folder = Path(sys.argv[1]), sys.argv[2]
    data = json.loads(source.read_text(encoding="utf-8"))
    if "games" not in data:
        sys.exit(f"{source} já foi separado (não tem `games`).")
    source.write_text(json.dumps(split_builds(data, folder), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{source.name}: {len(list(Path(folder).glob('*.json')))} campeões em {folder}")
