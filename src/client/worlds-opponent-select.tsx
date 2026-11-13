import { useEffect, useRef, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { lolAsset, lolChampion } from "./lol-media"
import { championSlug } from "./worlds-display"

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
  const results = useRef<HTMLDivElement>(null)
  const selected = opponents.find(opponent => opponent.slug === value)
  const term = championSlug(query).replace(/-/g, "")
  const matches = opponents.filter(opponent => opponent.slug.replace(/-/g, "").includes(term))

  useEffect(() => {
    if (restoreFocus) trigger.current?.focus({ preventScroll: true })
  }, [restoreFocus])

  useEffect(() => {
    if (!open) return
    const close = () => queueMicrotask(() => {
      if (!document.hasFocus()) setOpen(false)
    })
    window.addEventListener("blur", close)
    return () => window.removeEventListener("blur", close)
  }, [open])

  const choose = (next: string) => {
    setOpen(false)
    if (next !== value) window.setTimeout(() => onChange(next), 0)
  }

  const option = (opponent?: Opponent) => {
    const slug = opponent?.slug ?? ""
    return <button key={slug} type="button" className="build-opponent-option" aria-pressed={value === slug}
      onClick={() => choose(slug)}>
      <span className="team-select-option"><OpponentLabel opponent={opponent} /></span>
      {opponent && <small className="build-opponent-count">{opponent.games} {opponent.games === 1 ? "jogo" : "jogos"}</small>}
    </button>
  }

  return <Popover open={open} onOpenChange={next => {
    if (next) setQuery("")
    setOpen(next)
  }}>
    <PopoverTrigger ref={trigger} id="build-opponent-trigger" data-team-trigger="select" data-slot="button" data-variant="outline"
      aria-labelledby="build-opponent-label build-opponent-trigger">
      <span data-slot="select-value"><OpponentLabel opponent={selected} /></span>
      <ChevronDownIcon aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent className="team-note-popover build-opponent-options" align="end"
      collisionPadding={8} aria-label="Adversário direto"
      onOpenAutoFocus={event => {
        event.preventDefault()
        search.current?.focus()
      }}
      onKeyDown={event => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(".build-opponent-option")]
        const index = buttons.indexOf(event.target as HTMLButtonElement)
        const next = event.key === "ArrowDown" ? buttons[index + 1] : buttons[index - 1] ?? search.current
        event.preventDefault()
        next?.focus()
      }}
      onCloseAutoFocus={event => { if (!document.hasFocus()) event.preventDefault() }}>
      <Input ref={search} type="search" aria-label="Buscar adversário" placeholder="Buscar adversário…" value={query}
        onChange={event => {
          setQuery(event.target.value)
          if (results.current) results.current.scrollTop = 0
        }}
        onKeyDown={event => {
          if (event.key === "Enter" && !event.nativeEvent.isComposing && matches.length) choose(matches[0].slug)
        }} />
      {option()}
      <div ref={results} className="build-opponent-results">
        {matches.length ? matches.map(option) : <p role="status" className="build-opponent-empty">Nenhum adversário encontrado.</p>}
      </div>
    </PopoverContent>
  </Popover>
}
