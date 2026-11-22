import { useEffect, useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import type { DraftSide } from "../model/local-state"
import { Icon, keepFocusOutsideFrame, useTeamOverlay } from "./team-controls"
import { MatchupOption, Preview, type MatchupItem } from "./matchup-preview"

/** Nome da comp editável no próprio card do lado: Enter ou sair do campo salva, Esc cancela. */
export function InlineName({
  kind,
  label,
  side,
  item,
  onSave,
  onClose,
}: {
  kind: "ours" | "rival"
  label: string
  side: DraftSide
  item: MatchupItem
  onSave: (name: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(item.name)
  const done = (shouldSave: boolean) => {
    if (shouldSave) onSave(value)
    onClose()
  }
  return (
    <div className={`matchup-pick ${kind} editing`}>
      <span className="matchup-pick-text">
        <small>
          <span className={`side-dot ${side}`} aria-hidden="true" />
          {label}
        </small>
        <Input
          className="matchup-name-input"
          value={value}
          autoFocus
          aria-label={`Nome de ${item.name}`}
          onFocus={event => event.currentTarget.select()}
          onChange={event => setValue(event.target.value)}
          onBlur={() => done(true)}
          onKeyDown={event => {
            if (event.key === "Enter") {
              event.preventDefault()
              done(true)
            }
            if (event.key === "Escape") {
              event.preventDefault()
              done(false)
            }
          }}
        />
      </span>
    </div>
  )
}

export type ChoiceMode = "replace" | "new"

/** Evento que os botões do quadro disparam para abrir a lista de composições junto deles. */
export const CHOOSE_EVENT = "weblol:choose-comp"

export function CompPicker({
  kind,
  label,
  side,
  items,
  selected,
  noneLabel,
  newLabel,
  branch,
  onSelect,
  onNew,
}: {
  kind: "ours" | "rival"
  label: string
  side: DraftSide
  items: MatchupItem[]
  selected: MatchupItem | null
  noneLabel?: string
  newLabel: string
  /** Com um confronto aberto, trocar a comp pergunta se substitui neste confronto ou cria outro. */
  branch?: boolean
  onSelect: (id: string | null, mode?: ChoiceMode) => void
  onNew: () => void
}) {
  const { open, setOpen } = useTeamOverlay()
  const [query, setQuery] = useState("")
  // Botões fora da barra ("Escolher existente") pedem o menu e ele abre junto do botão clicado.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<{ kind: string; anchor: HTMLElement }>).detail
      if (detail.kind !== kind) return
      setAnchor(detail.anchor)
      setOpen(true)
    }
    document.addEventListener(CHOOSE_EVENT, handleRequest)
    return () => document.removeEventListener(CHOOSE_EVENT, handleRequest)
  }, [kind, setOpen])
  const handleOpenChange = (shouldOpen: boolean) => {
    setOpen(shouldOpen)
    if (!shouldOpen) {
      setAnchor(null)
      setPending(null)
    }
  }
  const searchId = useId()
  const q = query.trim().toLowerCase()
  const matches = items.filter(
    item =>
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.champions.some(name => name.toLowerCase().includes(q)),
  )
  const create = () => {
    handleOpenChange(false)
    setQuery("")
    queueMicrotask(onNew)
  }
  const [pending, setPending] = useState<MatchupItem | null>(null)
  const finish = (id: string | null, mode?: ChoiceMode) => {
    handleOpenChange(false)
    setQuery("")
    setPending(null)
    queueMicrotask(() => onSelect(id, mode))
  }
  const choose = (id: string | null) => {
    if (id === (selected?.id ?? null)) return handleOpenChange(false)
    const picked = items.find(item => item.id === id)
    if (branch && picked) setPending(picked)
    else finish(id)
  }
  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      {anchor && <PopoverAnchor virtualRef={{ current: anchor }} />}
      <PopoverTrigger className={`matchup-pick ${kind}`} data-matchup={kind}>
        <span className="matchup-pick-text">
          <small>
            <span className={`side-dot ${side}`} aria-hidden="true" />
            {label}
          </small>
          <b title={selected?.title}>{selected ? selected.title : noneLabel}</b>
        </span>
        {selected && <Preview names={selected.preview} />}
        <span className="sr-only">Trocar</span>
        <ChevronDown className="matchup-chevron" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        className="matchup-popover"
        align="start"
        collisionPadding={8}
        aria-label={label}
        onCloseAutoFocus={keepFocusOutsideFrame}
      >
        {pending ? (
          <fieldset className="matchup-branch" aria-label={`Trocar por ${pending.title}`}>
            <p>
              Trocar por <b>{pending.title}</b>
            </p>
            <button
              type="button"
              className="matchup-item"
              ref={node => node?.focus()}
              onClick={() => finish(pending.id, "replace")}
            >
              <b>Substituir neste confronto</b>
            </button>
            <button type="button" className="matchup-item" onClick={() => finish(pending.id, "new")}>
              <b>Criar novo confronto</b>
            </button>
          </fieldset>
        ) : (
          <>
            <Input
              id={searchId}
              type="search"
              aria-label={`Buscar ${label.toLowerCase()} pelo nome ou campeão`}
              value={query}
              placeholder="Nome ou campeão"
              autoFocus
              onChange={event => setQuery(event.target.value)}
            />
            <fieldset className="matchup-list" aria-label={label}>
              {!q && (
                <button type="button" className="matchup-item new" onClick={create}>
                  <b>
                    <Icon name="plus" /> {newLabel}
                  </b>
                </button>
              )}
              {noneLabel && !q && (
                <button
                  type="button"
                  className="matchup-item none"
                  aria-pressed={!selected}
                  onClick={() => choose(null)}
                >
                  <b>{noneLabel}</b>
                </button>
              )}
              {matches.map(item => (
                <MatchupOption key={item.id} item={item} selected={item.id === selected?.id} onChoose={choose} />
              ))}
              {!matches.length && (
                <p className="matchup-empty" role="status">
                  {items.length
                    ? "Nenhuma composição encontrada. Tente outro nome ou campeão."
                    : "Nenhuma composição ainda."}
                </p>
              )}
            </fieldset>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
