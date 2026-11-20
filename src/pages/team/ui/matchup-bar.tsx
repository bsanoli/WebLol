import { useId, useState } from "react"
import { ChevronDown } from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import type { CompOwner } from "../model/composition-side"
import type { DraftSide } from "../model/local-state"
import { ActionMenu, Icon, keepFocusOutsideFrame, renderControl, useTeamOverlay } from "./team-controls"

/** Composição como aparece nas listas da barra: nome, prévia (HTML dos retratos) e campeões para a busca. */
export type MatchupItem = { id: string; name: string; title: string; preview: string; champions: string[] }

export type MatchupBarProps = {
  ours: MatchupItem[]
  enemies: MatchupItem[]
  current: MatchupItem
  enemy: MatchupItem | null
  side: DraftSide
  enemyOpgg: string
  onSelectOurs: (id: string) => void
  onSelectEnemy: (id: string | null) => void
  onSide: (side: DraftSide) => void
  onNew: (owner: CompOwner) => void
  onMove: (id: string) => void
  onOpgg: (id: string) => void
  onRename: (id: string) => void
  onRenameTo: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

const SIDES: [DraftSide, string][] = [
  ["blue", "Azul"],
  ["red", "Vermelho"],
]

function Preview({ html }: { html: string }) {
  return html ? (
    <span className="mini matchup-preview" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span className="mini matchup-preview">
      <small>vazia</small>
    </span>
  )
}

/** Nome da comp editável no próprio card do lado: Enter ou sair do campo salva, Esc cancela. */
function InlineName({
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

function CompPicker({
  kind,
  label,
  side,
  items,
  selected,
  noneLabel,
  newLabel,
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
  onSelect: (id: string | null) => void
  onNew: () => void
}) {
  const { open, setOpen } = useTeamOverlay()
  const [query, setQuery] = useState("")
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
    setOpen(false)
    setQuery("")
    queueMicrotask(onNew)
  }
  const choose = (id: string | null) => {
    setOpen(false)
    setQuery("")
    if (id !== (selected?.id ?? null)) queueMicrotask(() => onSelect(id))
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={`matchup-pick ${kind}`} data-matchup={kind}>
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
      </PopoverTrigger>
      <PopoverContent
        className="matchup-popover"
        align="start"
        collisionPadding={8}
        aria-label={label}
        onCloseAutoFocus={keepFocusOutsideFrame}
      >
        <Input
          id={searchId}
          type="search"
          aria-label={`Buscar ${label.toLowerCase()} pelo nome ou campeão`}
          value={query}
          placeholder="Nome ou campeão"
          autoFocus
          onChange={event => setQuery(event.target.value)}
        />
        <div className="matchup-list" role="group" aria-label={label}>
          {!q && (
            <button type="button" className="matchup-item new" onClick={create}>
              <b>
                <Icon name="plus" /> {newLabel}
              </b>
            </button>
          )}
          {noneLabel && !q && (
            <button type="button" className="matchup-item none" aria-pressed={!selected} onClick={() => choose(null)}>
              <b>{noneLabel}</b>
            </button>
          )}
          {matches.map(item => (
            <button
              type="button"
              key={item.id}
              className="matchup-item"
              aria-pressed={item.id === selected?.id}
              onClick={() => choose(item.id)}
            >
              <b title={item.title}>{item.title}</b>
              <Preview html={item.preview} />
            </button>
          ))}
          {!matches.length && (
            <p className="matchup-empty" role="status">
              {items.length
                ? "Nenhuma composição encontrada. Tente outro nome ou campeão."
                : "Nenhuma composição ainda."}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

const compActions = (item: MatchupItem, props: MatchupBarProps, enemy: boolean) => [
  {
    label: enemy ? "Mover para nossas" : "Mover para adversárias",
    icon: <Icon name="swap" />,
    run: () => props.onMove(item.id),
  },
  ...(enemy ? [{ label: "Link do OP.GG…", icon: <Icon name="link" />, run: () => props.onOpgg(item.id) }] : []),
  { label: "Renomear", icon: <Icon name="edit" />, run: () => props.onRename(item.id) },
  { label: "Duplicar", icon: <Icon name="duplicate" />, run: () => props.onDuplicate(item.id) },
  { label: "Excluir", icon: <Icon name="trash" />, destructive: true, run: () => props.onDelete(item.id) },
]

function MatchupBar(props: MatchupBarProps) {
  const { ours, enemies, current, enemy, side, enemyOpgg } = props
  const [renaming, setRenaming] = useState<"ours" | "rival" | null>(null)
  const other: DraftSide = side === "blue" ? "red" : "blue"
  const oursBlock = (
    <div key="ours" className={`matchup-team ours ${side}`}>
      {renaming === "ours" ? (
        <InlineName
          kind="ours"
          label={`Lado ${side === "blue" ? "azul" : "vermelho"} · Nossa`}
          side={side}
          item={current}
          onSave={name => props.onRenameTo(current.id, name)}
          onClose={() => setRenaming(null)}
        />
      ) : (
        <CompPicker
          kind="ours"
          label={`Lado ${side === "blue" ? "azul" : "vermelho"} · Nossa`}
          side={side}
          items={ours}
          selected={current}
          newLabel="Nova composição nossa"
          onSelect={id => id && props.onSelectOurs(id)}
          onNew={() => props.onNew("ours")}
        />
      )}
      {renaming !== "ours" && (
        <button
          type="button"
          className="matchup-rename"
          data-matchup-rename="ours"
          data-slot="button"
          data-variant="ghost"
          data-size="sm"
          aria-label={`Editar o nome de ${current.name}`}
          title="Editar o nome"
          onClick={() => setRenaming("ours")}
        >
          <Icon name="edit" />
        </button>
      )}
      <span className="composition-menu">
        <ActionMenu label={`Ações de ${current.name}`} actions={compActions(current, props, false)} />
      </span>
    </div>
  )
  const rivalBlock = (
    <div key="rival" className={`matchup-team rival ${other}`}>
      {renaming === "rival" && enemy ? (
        <InlineName
          kind="rival"
          label={`Lado ${other === "blue" ? "azul" : "vermelho"} · Adversária`}
          side={other}
          item={enemy}
          onSave={name => props.onRenameTo(enemy.id, name)}
          onClose={() => setRenaming(null)}
        />
      ) : (
        <CompPicker
          kind="rival"
          label={`Lado ${other === "blue" ? "azul" : "vermelho"} · Adversária`}
          side={other}
          items={enemies}
          selected={enemy}
          noneLabel="Sem adversária"
          newLabel="Nova adversária"
          onSelect={props.onSelectEnemy}
          onNew={() => props.onNew("enemy")}
        />
      )}
      {enemy && renaming !== "rival" && (
        <button
          type="button"
          className="matchup-rename"
          data-matchup-rename="rival"
          data-slot="button"
          data-variant="ghost"
          data-size="sm"
          aria-label={`Editar o nome de ${enemy.name}`}
          title="Editar o nome"
          onClick={() => setRenaming("rival")}
        >
          <Icon name="edit" />
        </button>
      )}
      {enemy && (
        <span className="composition-menu">
          <ActionMenu label={`Ações de ${enemy.name}`} actions={compActions(enemy, props, true)} />
        </span>
      )}
      {enemy && enemyOpgg && (
        <>
          <a
            className="matchup-opgg"
            data-slot="button"
            data-variant="ghost"
            data-size="sm"
            href={enemyOpgg}
            target="_blank"
            rel="noopener"
            title={enemyOpgg}
            aria-label={`Abrir o OP.GG de ${enemy.name}`}
          >
            <Icon name="link" /> OP.GG
          </a>
          <button
            type="button"
            className="matchup-opgg-edit"
            data-matchup-opgg
            data-slot="button"
            data-variant="ghost"
            data-size="sm"
            aria-label={`Editar o link do OP.GG de ${enemy.name}`}
            title="Editar o link do OP.GG"
            onClick={() => props.onOpgg(enemy.id)}
          >
            <Icon name="edit" />
          </button>
        </>
      )}
      {enemy && !enemyOpgg && (
        <button
          type="button"
          className="matchup-opgg"
          data-matchup-opgg
          data-slot="button"
          data-variant="ghost"
          data-size="sm"
          aria-label={`Adicionar o link do OP.GG de ${enemy.name}`}
          onClick={() => props.onOpgg(enemy.id)}
        >
          <Icon name="plus" /> OP.GG
        </button>
      )}
    </div>
  )
  const swapTo: DraftSide = other
  return (
    <div className="matchup" role="group" aria-label="Confronto do draft">
      {side === "blue" ? oursBlock : rivalBlock}
      <button
        type="button"
        className="matchup-swap"
        data-slot="button"
        data-variant="outline"
        data-size="sm"
        data-side-option={swapTo}
        aria-label={`Trocar lados: nossa equipe vai para o lado ${swapTo === "blue" ? "azul" : "vermelho"}`}
        onClick={() => props.onSide(swapTo)}
      >
        <Icon name="swap" /> Trocar lados
      </button>
      {side === "blue" ? rivalBlock : oursBlock}
    </div>
  )
}

export function mountMatchupBar(host: Element, props: MatchupBarProps) {
  renderControl(host, <MatchupBar {...props} />)
}
