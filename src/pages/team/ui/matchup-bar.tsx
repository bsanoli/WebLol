import { useState } from "react"
import { ChevronsDownUp, ChevronsUpDown, MoreHorizontal } from "lucide-react"
import type { CompOwner } from "../model/composition-side"
import type { DraftSide } from "../model/local-state"
import { ActionMenu, Icon, renderControl } from "./team-controls"
import type { MatchupItem } from "./matchup-preview"
import { CompPicker, InlineName, type ChoiceMode } from "./matchup-picker"
import { UndoButton } from "./matchup-undo"

export type MatchupBarProps = {
  ours: MatchupItem[]
  enemies: MatchupItem[]
  current: MatchupItem
  enemy: MatchupItem | null
  side: DraftSide
  /** Confronto aberto (com o nome mostrado) ou `null` quando só uma comp está aberta. */
  matchup: { id: string; title: string; named: boolean } | null
  enemyOpgg: string
  /** Barra recolhida: uma linha fina com os nomes e o lado. */
  collapsed: boolean
  /** Há uma ação para desfazer (troca de lados, campeão removido por arraste). */
  canUndo: boolean
  onToggleCollapsed: () => void
  onSelectOurs: (id: string, mode?: ChoiceMode) => void
  onSelectEnemy: (id: string | null, mode?: ChoiceMode) => void
  onSide: (side: DraftSide) => void
  onRenameMatchup: () => void
  onLeaveMatchup: () => void
  onNew: (owner: CompOwner) => void
  onMove: (id: string) => void
  onOpgg: (id: string) => void
  onRename: (id: string) => void
  onRenameTo: (id: string, name: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
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
  const { ours, enemies, current, enemy, side, enemyOpgg, collapsed } = props
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
          branch={!!props.matchup}
          onSelect={(id, mode) => id && props.onSelectOurs(id, mode)}
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
          noneLabel="Escolher adversária"
          newLabel="Nova adversária"
          branch={!!props.matchup && !!enemy}
          onSelect={props.onSelectEnemy}
          onNew={() => props.onNew("enemy")}
        />
      )}
      {renaming !== "rival" && (
        <button
          type="button"
          className="matchup-rename"
          data-matchup-rename="rival"
          data-slot="button"
          data-variant="ghost"
          data-size="sm"
          aria-label={enemy ? `Editar o nome de ${enemy.name}` : "Editar o nome da adversária"}
          title="Editar o nome"
          disabled={!enemy}
          onClick={() => setRenaming("rival")}
        >
          <Icon name="edit" />
        </button>
      )}
      <span className="composition-menu">
        {enemy ? (
          <ActionMenu label={`Ações de ${enemy.name}`} actions={compActions(enemy, props, true)} />
        ) : (
          <button
            type="button"
            data-team-trigger="icon"
            disabled
            aria-label="Ações da adversária (escolha uma adversária primeiro)"
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
        )}
      </span>
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
  const head = (
    <div className="matchup-head">
      {props.matchup ? (
        <>
          <span className="matchup-badge">Confronto</span>
          <b className="matchup-title" title={props.matchup.title}>
            {props.matchup.title}
          </b>
          <button
            type="button"
            className="matchup-rename"
            data-matchup-rename-all
            data-slot="button"
            data-variant="ghost"
            data-size="sm"
            aria-label={`Renomear o confronto ${props.matchup.title}`}
            title="Renomear o confronto"
            onClick={props.onRenameMatchup}
          >
            <Icon name="edit" />
          </button>
          <button
            type="button"
            data-matchup-leave
            data-slot="button"
            data-variant="ghost"
            data-size="sm"
            onClick={props.onLeaveMatchup}
          >
            Sair do confronto
          </button>
        </>
      ) : (
        <span className="matchup-hint">Comp aberta sem confronto</span>
      )}
      <button type="button" data-matchup-new data-slot="button" data-variant="outline" data-size="sm">
        <Icon name="plus" /> Novo confronto
      </button>
    </div>
  )
  const toggle = (
    <button
      type="button"
      className="matchup-collapse"
      data-matchup-collapse
      data-slot="button"
      data-variant="ghost"
      data-size="sm"
      aria-expanded={!collapsed}
      aria-label={collapsed ? "Mostrar a barra de confronto" : "Recolher a barra de confronto"}
      title={collapsed ? "Mostrar a barra de confronto" : "Recolher a barra de confronto"}
      onClick={props.onToggleCollapsed}
    >
      {collapsed ? <ChevronsUpDown aria-hidden="true" /> : <ChevronsDownUp aria-hidden="true" />}
    </button>
  )
  if (collapsed)
    return (
      <>
        {head}
        <div className="matchup collapsed" role="group" aria-label="Confronto do draft">
          <span className="matchup-summary">
            <SideDot side={side} />
            <b>{current.name}</b>
            <span aria-hidden="true">x</span>
            <SideDot side={other} />
            <b>{enemy ? enemy.name : "Sem adversária"}</b>
          </span>
          {toggle}
        </div>
      </>
    )
  return (
    <>
      {head}
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
        <UndoButton visible={props.canUndo} />
        {side === "blue" ? rivalBlock : oursBlock}
        {toggle}
      </div>
    </>
  )
}

function SideDot({ side }: { side: DraftSide }) {
  return <i className={`side-dot ${side}`} role="img" aria-label={side === "blue" ? "Lado azul" : "Lado vermelho"} />
}

export function mountMatchupBar(host: Element, props: MatchupBarProps) {
  renderControl(host, <MatchupBar {...props} />)
}
