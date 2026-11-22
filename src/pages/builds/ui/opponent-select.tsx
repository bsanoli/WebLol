import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { ChevronDown } from "lucide-react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/shared/ui/combobox"
import { lolAsset, lolChampion } from "@/entities/champion"
import { championSlug } from "@/entities/match"

type Opponent = { name: string; slug: string; games: number }

const ALL_OPPONENTS = "todos"

function OpponentLabel({ opponent }: { opponent?: Opponent }) {
  if (!opponent) return <span className="team-select-label">Todos os adversários</span>
  const portrait = lolChampion(opponent.name)?.portrait
  return (
    <>
      {portrait && <img className="build-opponent-portrait" src={lolAsset(portrait)} alt="" />}
      <span className="team-select-label">{opponent.name}</span>
    </>
  )
}

export function WorldsOpponentSelect({
  opponents,
  value,
  onChange,
  restoreFocus,
}: {
  opponents: Opponent[]
  value: string
  onChange: (value: string) => void
  restoreFocus: boolean
}) {
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const [query, setQuery] = useState("")
  const selected = opponents.find(opponent => opponent.slug === value)
  // A busca ignora acentos e pontuação, como o resto das buscas por campeão.
  const term = championSlug(query.trim())
  const matches = opponents.filter(opponent => championSlug(opponent.name).includes(term))

  useEffect(() => {
    if (restoreFocus) trigger?.focus({ preventScroll: true })
  }, [restoreFocus, trigger])

  return (
    <Combobox
      value={value || ALL_OPPONENTS}
      query={query}
      filter={false}
      onQueryChange={setQuery}
      onOpenChange={isOpen => {
        if (isOpen) setQuery("")
      }}
      onOpenChangeComplete={isOpen => {
        if (!isOpen && document.hasFocus()) trigger?.focus({ preventScroll: true })
      }}
      onValueChange={next => {
        const slug = !next || next === ALL_OPPONENTS ? "" : next
        if (slug !== value) onChange(slug)
      }}
    >
      <ComboboxTrigger
        ref={setTrigger}
        id="build-opponent-trigger"
        data-team-trigger="select"
        data-size="sm"
        aria-labelledby="build-opponent-label build-opponent-trigger"
      >
        <span data-slot="select-value">
          <OpponentLabel opponent={selected} />
        </span>
        <ChevronDown aria-hidden="true" />
      </ComboboxTrigger>
      <ComboboxContent anchor={trigger}>
        <ComboboxInput aria-label="Pesquisar adversário" placeholder="Pesquisar adversário" autoFocus />
        <ComboboxList aria-label="Adversários">
          {!term && (
            <ComboboxItem value={ALL_OPPONENTS} label="Todos os adversários">
              Todos os adversários
            </ComboboxItem>
          )}
          {matches.map(opponent => (
            <ComboboxItem key={opponent.slug} value={opponent.slug} label={opponent.name}>
              <OpponentLabel opponent={opponent} />
              <small className="build-opponent-count">
                {opponent.games} {opponent.games === 1 ? "jogo" : "jogos"}
              </small>
            </ComboboxItem>
          ))}
        </ComboboxList>
        {term && !matches.length && <ComboboxEmpty>Nenhum adversário encontrado.</ComboboxEmpty>}
      </ComboboxContent>
    </Combobox>
  )
}

export function mountOpponentSelect(host: HTMLElement, props: Parameters<typeof WorldsOpponentSelect>[0]) {
  const root = createRoot(host)
  root.render(<WorldsOpponentSelect {...props} />)
  return root
}
