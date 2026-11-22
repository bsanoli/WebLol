import { useState } from "react"
import { createRoot } from "react-dom/client"
import { Button } from "@/shared/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/shared/ui/dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"

export const NEW_ENEMY = "__new-enemy"
export type MatchupChoice = { ours: string; enemy: string; side: "blue" | "red" }
/** Linhas da lista com altura e margem internas maiores, para o nome e os retratos respirarem. */
const ITEM_CLASS = "min-h-12 rounded-md py-2 pr-10 pl-3 cursor-pointer *:[span]:last:min-w-0 *:[span]:last:flex-1"

/** Opção da lista: nome e, quando houver, os retratos dos campeões (HTML já montado pela página). */
type Option = { id: string; name: string; preview?: string }

function OptionLabel({ item }: { item: Option }) {
  if (item.preview === undefined) return <>{item.name}</>
  return (
    <span className="mx-opt">
      <b title={item.name}>{item.name}</b>
      {item.preview ? (
        <span
          className="mx-opt-preview"
          aria-hidden="true"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: miniatura em SVG gerada pelo WebLol a partir do draft
          dangerouslySetInnerHTML={{ __html: item.preview }}
        />
      ) : (
        <small className="mx-opt-empty">vazia</small>
      )}
    </span>
  )
}

function MatchupForm({
  ours,
  enemies,
  initialOurs,
  onDone,
}: {
  ours: Option[]
  enemies: Option[]
  initialOurs: string
  onDone: (choice?: MatchupChoice) => void
}) {
  const [ourId, setOurId] = useState(initialOurs)
  const [enemyId, setEnemyId] = useState("")
  const [side, setSide] = useState<"blue" | "red">("blue")
  const field = (
    label: string,
    value: string,
    set: (id: string) => void,
    options: Option[],
    placeholder: string,
    extra?: Option,
  ) => (
    <label className="grid gap-2" data-slot="field">
      {label}
      <Select value={value} onValueChange={set}>
        <SelectTrigger className="w-full" aria-label={label}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent position="popper" align="start" sideOffset={4} className="p-2">
          <SelectGroup className="grid gap-1">
            {extra && (
              <SelectItem value={extra.id} className={ITEM_CLASS}>
                {extra.name}
              </SelectItem>
            )}
            {options.map(item => (
              <SelectItem key={item.id} value={item.id} textValue={item.name} className={ITEM_CLASS}>
                <OptionLabel item={item} />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </label>
  )
  return (
    <form
      className="grid gap-4"
      onSubmit={event => {
        event.preventDefault()
        if (ourId && enemyId) onDone({ ours: ourId, enemy: enemyId, side })
      }}
    >
      <p className="m-0 text-sm text-muted-foreground">
        Junte uma composição nossa a uma adversária para anotar a tática desse confronto. As duas continuam existindo
        separadas.
      </p>
      {field("Nossa composição", ourId, setOurId, ours, "Escolha a nossa composição")}
      {field("Adversária", enemyId, setEnemyId, enemies, "Escolha a adversária", {
        id: NEW_ENEMY,
        name: "+ Nova adversária…",
      })}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">
          <span role="status" aria-live="polite">
            <i className={`side-dot ${side}`} aria-hidden="true" /> Nossa no lado{" "}
            {side === "blue" ? "azul" : "vermelho"}
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-side-swap
          onClick={() => setSide(side === "blue" ? "red" : "blue")}
        >
          <span aria-hidden="true">⇄</span> Trocar lados
        </Button>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onDone()}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!ourId || !enemyId}>
          Criar confronto
        </Button>
      </div>
    </form>
  )
}

/** Diálogo curto para cadastrar um confronto: escolhe a comp nossa e a adversária (ou pede uma nova). */
export function askMatchup(ours: Option[], enemies: Option[], initialOurs: string) {
  const trigger = document.activeElement
  return new Promise<MatchupChoice | undefined>(resolve => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    let isFinished = false
    const finish = (choice?: MatchupChoice) => {
      if (isFinished) return
      isFinished = true
      queueMicrotask(() => {
        root.unmount()
        host.remove()
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
        resolve(choice)
      })
    }
    root.render(
      <Dialog
        open
        onOpenChange={open => {
          if (!open) finish()
        }}
      >
        <DialogContent
          className="wl-panel"
          aria-describedby={undefined}
          showCloseButton={false}
          onCloseAutoFocus={event => event.preventDefault()}
        >
          <DialogTitle>Novo confronto</DialogTitle>
          <MatchupForm ours={ours} enemies={enemies} initialOurs={initialOurs} onDone={finish} />
        </DialogContent>
      </Dialog>,
    )
  })
}
