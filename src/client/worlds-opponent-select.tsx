import { useEffect, useRef, useState } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { lolAsset, lolChampion } from "./lol-media"

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
  const trigger = useRef<HTMLButtonElement>(null)
  const selected = opponents.find(opponent => opponent.slug === value)

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

  return <Select open={open} onOpenChange={setOpen} value={selected?.slug ?? "all"}
    onValueChange={next => {
      setOpen(false)
      window.setTimeout(() => onChange(next === "all" ? "" : next), 0)
    }}>
    <SelectTrigger ref={trigger} id="build-opponent-trigger" data-team-trigger="select"
      aria-labelledby="build-opponent-label build-opponent-trigger">
      <SelectValue><OpponentLabel opponent={selected} /></SelectValue>
    </SelectTrigger>
    <SelectContent className="team-select-panel build-opponent-options" position="popper" align="start"
      sideOffset={4} collisionPadding={8}
      onCloseAutoFocus={event => { if (!document.hasFocus()) event.preventDefault() }}>
      <SelectGroup>
        <SelectItem value="all">Todos os adversários</SelectItem>
        {opponents.map(opponent => <SelectItem key={opponent.slug} value={opponent.slug} textValue={opponent.name}>
          <OpponentLabel opponent={opponent} />
          <small className="build-opponent-count">{opponent.games} {opponent.games === 1 ? "jogo" : "jogos"}</small>
        </SelectItem>)}
      </SelectGroup>
    </SelectContent>
  </Select>
}
