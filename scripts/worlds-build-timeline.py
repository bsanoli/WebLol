"""Gera src/data/worlds-2026-build-timeline.json para "Compras jogo a jogo" na aba Builds.

Copia de worlds-2026-builds.json só o que a linha do tempo usa (num arquivo à parte, carregado
quando a build abre) e acrescenta os times e o vencedor de cada jogo.
Cruza os jogos de worlds-2026-builds.json com os drafts de worlds.json (campeões do lado azul).
Jogos sem draft em worlds.json usam MANUAL (conferido no riftgraphs e no placar das séries).
Rode depois de atualizar as builds: python3 scripts/worlds-build-timeline.py
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"
MANUAL = {  # id do jogo: (time azul, time vermelho, lado vencedor)
    83601: ("Cloud9", "Karmine Corp", "red"),
    83602: ("Karmine Corp", "Cloud9", "blue"),
    83623: ("FURIA", "Cloud9", "red"),
    83624: ("Cloud9", "FURIA", "red"),
    83625: ("FURIA", "Cloud9", "blue"),
    83626: ("FURIA", "Cloud9", "blue"),
    83634: ("MVK", "FURIA", "blue"),
    83697: ("Invictus Gaming", "Top Esports", "blue"),
    83712: ("Karmine Corp", "T1", "red"),
}

builds = json.loads((DATA / "worlds-2026-builds.json").read_text(encoding="utf-8"))
worlds = json.loads((DATA / "worlds.json").read_text(encoding="utf-8"))
drafts = {tuple(sorted(p[1] for p in c["p"])): c for c in worlds["comps"]}
timeline, missing = [], []
for game in builds["games"]:
    blue = tuple(sorted(p["champion"] for p in game["players"] if p["side"] == "blue"))
    if game["id"] in MANUAL:
        b, r, winner = MANUAL[game["id"]]
    elif blue in drafts:
        c = drafts[blue]
        b, r, winner = c["b"], c["r"], "blue" if c["bw"] else "red"
    else:
        missing.append(game["id"])
        continue
    timeline.append({
        **{key: game[key] for key in ("id", "date", "stage", "round", "number", "buildsSource")},
        "blue": b, "red": r, "winner": winner,
        "players": [{key: p[key] for key in ("player", "champion", "role", "side", "kda", "itemEventsByMinute")}
                    for p in game["players"]],
    })
(DATA / "worlds-2026-build-timeline.json").write_text(
    json.dumps({"games": timeline}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(timeline)} jogos na linha do tempo; sem resultado: {missing or 'nenhum'}")
