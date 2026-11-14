import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { lolAsset, lolChampion } from "@/entities/champion"
import { championSlug } from "@/entities/match"

type Opponent = { name: string; slug: string; games: number }

function OpponentLabel({ opponent }: { opponent?: Opponent }) {
  if (!opponent) return <span className="team-select-label">Todos os adversários</span>
  const portrait = lolChampion(opponent.name)?.portrait
  return <>
    {portrait && <img className="build-opponent-portrait" src={lolAsset(portrait)} alt="" />}
    <span className="team-select-label">{opponent.name}</span>
  </>
}

export function WorldsOpponentSelect({ opponents, value, onChange, restoreFocus }: {
  opponents: Opponent[]
  value: string
  onChange: (value: string) => void
  restoreFocus: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const trigger = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const options = useRef<HTMLDivElement>(null)
  const selected = opponents.find(opponent => opponent.slug === value)
  const term = championSlug(query.trim())
  const matches = opponents.filter(opponent => championSlug(opponent.name).includes(term))

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function choose(next: string) {
    changeOpen(false)
    if (next !== value) onChange(next)
  }

  useEffect(() => {
    if (restoreFocus) trigger.current?.focus({ preventScroll: true })
  }, [restoreFocus])

  useEffect(() => {
    if (!open) return
    const close = () => queueMicrotask(() => {
      if (!document.hasFocus()) changeOpen(false)
    })
    window.addEventListener("blur", close)
    return () => window.removeEventListener("blur", close)
  }, [open])

  return <Popover open={open} onOpenChange={changeOpen}>
    <PopoverTrigger asChild>
      <button ref={trigger} id="build-opponent-trigger" type="button" data-team-trigger="select" data-size="sm"
        aria-labelledby="build-opponent-label build-opponent-trigger">
        <span data-slot="select-value"><OpponentLabel opponent={selected} /></span>
        <ChevronDown aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent className="team-note-popover build-opponent-options" align="start" collisionPadding={8}
      aria-labelledby="build-opponent-label"
      onOpenAutoFocus={event => {
        event.preventDefault()
        search.current?.focus()
      }}
      onCloseAutoFocus={event => { if (!document.hasFocus()) event.preventDefault() }}>
      <input ref={search} type="search" data-slot="input" aria-label="Pesquisar adversário"
        placeholder="Pesquisar adversário" value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === "ArrowDown") {
            event.preventDefault()
            options.current?.querySelector("button")?.focus()
          }
          if (event.key === "Enter" && term && matches.length === 1) {
            event.preventDefault()
            choose(matches[0].slug)
          }
        }} />
      <div ref={options} className="build-opponent-results" role="group" aria-label="Adversários">
        {!term && <button type="button" data-slot="button" data-variant="ghost" aria-pressed={!selected}
          onClick={() => choose("")}>Todos os adversários</button>}
        {matches.map(opponent => <button key={opponent.slug} type="button" data-slot="button" data-variant="ghost"
          aria-pressed={opponent.slug === value} onClick={() => choose(opponent.slug)}>
          <OpponentLabel opponent={opponent} />
          <small className="build-opponent-count">{opponent.games} {opponent.games === 1 ? "jogo" : "jogos"}</small>
        </button>)}
        {term && !matches.length && <p role="status">Nenhum adversário encontrado.</p>}
      </div>
    </PopoverContent>
  </Popover>
}
