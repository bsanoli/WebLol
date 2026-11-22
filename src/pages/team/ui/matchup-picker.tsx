import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/shared/ui/input"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/shared/ui/combobox"
import type { DraftSide } from "../model/local-state"
import { Icon, useTeamOverlay } from "./team-controls"
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
  const done = (save: boolean) => {
    if (save) onSave(value)
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

/** Valores reservados das linhas fixas da lista; os demais valores são ids de composição. */
const NONE_VALUE = "__none__"
const NEW_VALUE = "__new__"

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
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  // Botões fora da barra ("Escolher existente") pedem o menu e ele abre junto do botão clicado.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [pending, setPending] = useState<MatchupItem | null>(null)
  // Espelha `pending` para os eventos do Combobox, que chegam antes de o React renderizar de novo.
  const pendingRef = useRef<MatchupItem | null>(null)
  const startPending = (item: MatchupItem | null) => {
    pendingRef.current = item
    setPending(item)
  }
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
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) setQuery("")
    else {
      setAnchor(null)
      startPending(null)
    }
  }
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
    queueMicrotask(onNew)
  }
  const finish = (id: string | null, mode?: ChoiceMode) => {
    handleOpenChange(false)
    queueMicrotask(() => onSelect(id, mode))
  }
  const choose = (id: string | null) => {
    if (id === (selected?.id ?? null)) return handleOpenChange(false)
    const picked = items.find(item => item.id === id)
    if (branch && picked) startPending(picked)
    else finish(id)
  }
  const handleValueChange = (value: string | null) => {
    if (value === NEW_VALUE) create()
    else choose(!value || value === NONE_VALUE ? null : value)
  }
  return (
    <Combobox
      open={open}
      value={selected?.id ?? NONE_VALUE}
      query={query}
      filter={false}
      onQueryChange={setQuery}
      onValueChange={handleValueChange}
      onOpenChange={(next, details) => {
        // Com a pergunta de substituir ou criar na tela, só Esc e clique fora fecham o menu.
        if (!next && pendingRef.current && (details.reason === "focus-out" || details.reason === "item-press")) {
          details.cancel()
          return
        }
        // Escolher a comp que já está selecionada não dispara onValueChange: fecha por aqui.
        if (!next && branch && details.reason === "item-press") {
          details.cancel()
          queueMicrotask(() => {
            if (!pendingRef.current) handleOpenChange(false)
          })
          return
        }
        handleOpenChange(next)
      }}
      onOpenChangeComplete={next => {
        // Dentro do iframe, só devolve o foco ao botão quando a página ainda o tem.
        if (!next && document.hasFocus()) trigger?.focus({ preventScroll: true })
      }}
    >
      <ComboboxTrigger ref={setTrigger} className={`matchup-pick ${kind}`} data-matchup={kind}>
        <span className="matchup-pick-text">
          <small>
            <span className={`side-dot ${side}`} aria-hidden="true" />
            {label}
          </small>
          <b title={selected?.title}>{selected ? selected.title : noneLabel}</b>
        </span>
        {selected && <Preview html={selected.preview} />}
        <span className="sr-only">Trocar</span>
        <ChevronDown className="matchup-chevron" aria-hidden="true" />
      </ComboboxTrigger>
      <ComboboxContent className="matchup-popover" anchor={anchor ?? trigger} aria-label={label}>
        {pending ? (
          <div className="matchup-branch" role="group" aria-label={`Trocar por ${pending.title}`}>
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
          </div>
        ) : (
          <>
            <ComboboxInput
              aria-label={`Buscar ${label.toLowerCase()} pelo nome ou campeão`}
              placeholder="Nome ou campeão"
              autoFocus
            />
            <ComboboxList className="matchup-list" aria-label={label}>
              {!q && (
                <ComboboxItem className="matchup-item new" value={NEW_VALUE} label={newLabel}>
                  <b>
                    <Icon name="plus" /> {newLabel}
                  </b>
                </ComboboxItem>
              )}
              {noneLabel && !q && (
                <ComboboxItem className="matchup-item none" value={NONE_VALUE} label={noneLabel}>
                  <b>{noneLabel}</b>
                </ComboboxItem>
              )}
              {matches.map(item => (
                <MatchupOption key={item.id} item={item} />
              ))}
            </ComboboxList>
            {!matches.length && (
              <ComboboxEmpty className="matchup-empty">
                {items.length
                  ? "Nenhuma composição encontrada. Tente outro nome ou campeão."
                  : "Nenhuma composição ainda."}
              </ComboboxEmpty>
            )}
          </>
        )}
      </ComboboxContent>
    </Combobox>
  )
}
