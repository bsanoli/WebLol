// Retratos dos campeões como elementos React, sem montar HTML em texto.
import { useState } from "react"
import { lolAsset } from "@/entities/champion"
import { DRAFT_LANES } from "../model/local-state"
import { champArt, initials } from "./team-store"

/** Retrato redondo: iniciais por baixo e a imagem por cima; se a imagem falhar, ficam só as iniciais. */
function ChampionPortrait({ name }: { name: string }) {
  const [hasFailed, setHasFailed] = useState(false)
  const portrait = champArt(name)?.portrait
  return (
    <span className="av" aria-hidden="true">
      {initials(name)}
      {portrait && !hasFailed ? (
        <img
          alt=""
          className="champ-portrait"
          loading="lazy"
          src={lolAsset(portrait)}
          onError={() => setHasFailed(true)}
        />
      ) : null}
    </span>
  )
}

/** Cinco lanes em posições fixas: uma lane sem campeão deixa o espaço vazio, sem deslocar as outras. */
export function ChampionPortraits({ names }: { names: string[] }) {
  return DRAFT_LANES.map((lane, position) => {
    const name = names[position]
    return name ? (
      <ChampionPortrait key={lane} name={name} />
    ) : (
      <span key={lane} className="av av-empty" aria-hidden="true" />
    )
  })
}
