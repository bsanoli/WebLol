import { Fragment, useEffect, useId, useReducer, useState } from "react"
import type { ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const roots = new WeakMap<Element, Root>()

function renderControl(host: Element, control: ReactNode) {
  let root = roots.get(host)
  if (!root) {
    root = createRoot(host)
    roots.set(host, root)
  }
  root.render(control)
}

export function clearTeamControls(region: Element) {
  for (const host of region.querySelectorAll("[data-team-control]")) {
    roots.get(host)?.unmount()
    roots.delete(host)
  }
}

function Icon({ name }: { name: string }) {
  return <svg className="icon" aria-hidden="true"><use href={`assets/icons.svg#${name}`} /></svg>
}

type MenuAction = {
  label: string
  icon: ReactNode
  disabled?: boolean
  destructive?: boolean
  run: () => void
}

// A click in the parent shell blurs this iframe without dispatching a pointer event here.
function useTeamOverlay() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("blur", close)
    return () => window.removeEventListener("blur", close)
  }, [open])
  return { open, setOpen }
}

function keepFocusOutsideFrame(event: Event) {
  if (!document.hasFocus()) event.preventDefault()
}

function ActionMenu({ label, heading, actions }: {
  label: string
  heading?: string
  actions: MenuAction[]
}) {
  const { open, setOpen } = useTeamOverlay()
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger data-team-trigger="icon" aria-label={label}>
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="team-menu" align="end" collisionPadding={8}
        onCloseAutoFocus={keepFocusOutsideFrame}>
        <DropdownMenuGroup>
          {heading && <DropdownMenuLabel>{heading}</DropdownMenuLabel>}
          {actions.map(({ label, icon, disabled, destructive, run }) => (
            <Fragment key={label}>
              {destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem disabled={disabled}
                variant={destructive ? "destructive" : "default"}
                onSelect={() => queueMicrotask(run)}>
                {icon}{label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function mountCompositionMenu(host: Element, name: string, duplicate: () => void, remove: () => void) {
  renderControl(host, <ActionMenu label={`Ações de ${name}`} actions={[
    { label: "Duplicar", icon: <Icon name="duplicate" />, run: duplicate },
    { label: "Excluir", icon: <Icon name="trash" />, destructive: true, run: remove },
  ]} />)
}

export function mountChampionMenu(host: Element, name: string, index: number, count: number,
  move: (direction: number) => void, remove: () => void) {
  renderControl(host, <ActionMenu label={`Opções de ${name}`} heading={`${index + 1}ª opção · ${name}`} actions={[
    { label: "Mover antes", icon: <ArrowUp />, disabled: index === 0, run: () => move(-1) },
    { label: "Mover depois", icon: <ArrowDown />, disabled: index === count - 1, run: () => move(1) },
    { label: `Remover ${name}`, icon: <Icon name="trash" />, destructive: true, run: remove },
  ]} />)
}

function LaneNote({ label, initialNote, onEdit }: {
  label: string
  initialNote: string
  onEdit: (note: string) => void
}) {
  const { open, setOpen } = useTeamOverlay()
  const inputId = useId()
  const [note, setNote] = useState(initialNote)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger data-team-trigger="note" aria-label={label} title={note || "Adicionar observação"}>
        <Icon name="edit" />
        <span className="pick-note-preview">{note || "Nota"}</span>
      </PopoverTrigger>
      <PopoverContent className="team-note-popover" align="end" collisionPadding={8} aria-label={label}
        onCloseAutoFocus={keepFocusOutsideFrame}>
        <label htmlFor={inputId}>{label}</label>
        <Input id={inputId} value={note} placeholder="Plano para esta posição" onChange={event => {
          setNote(event.target.value)
          onEdit(event.target.value)
        }} />
      </PopoverContent>
    </Popover>
  )
}

export function mountLaneNote(host: Element, label: string, note: string, onEdit: (note: string) => void) {
  renderControl(host, <LaneNote label={label} initialNote={note} onEdit={onEdit} />)
}

function TeamSelect({ field }: { field: HTMLSelectElement }) {
  const { open, setOpen } = useTeamOverlay()
  const [, refresh] = useReducer((version: number) => version + 1, 0)
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()
  const options = Array.from(field.options)
  const selected = options[field.selectedIndex]
  const lanes = field.dataset.teamSelect === "lane"
  const compact = field.hasAttribute("data-pick-position")

  function renderLabel(option: HTMLOptionElement) {
    return <>
      {lanes && option.value !== "ban" && <img className="lane-icon" src={`assets/lanes/${option.value}.svg`} alt="" />}
      <span className="team-select-label">{option.dataset.label ?? option.text}</span>
    </>
  }

  return (
    <Select open={open} value={selected ? String(selected.index) : ""} disabled={field.disabled || options.length === 0}
      onOpenChange={nextOpen => {
        if (nextOpen) setPortalContainer(field.closest("dialog[open]") ?? undefined)
        setOpen(nextOpen)
      }}
      onValueChange={value => {
        field.selectedIndex = Number(value)
        refresh()
        queueMicrotask(() => field.dispatchEvent(new Event("change", { bubbles: true })))
      }}>
      <SelectTrigger id={field.id ? `${field.id}-trigger` : undefined}
        size={compact ? "sm" : "default"} data-team-trigger="select"
        aria-label={field.getAttribute("aria-label") ?? undefined}
        aria-labelledby={field.getAttribute("aria-labelledby") ?? undefined}>
        <SelectValue>{selected ? renderLabel(selected) : "Sem opções"}</SelectValue>
      </SelectTrigger>
      <SelectContent className="team-select-panel" position="popper" align="start" sideOffset={4}
        collisionPadding={8} portalContainer={portalContainer}
        onCloseAutoFocus={keepFocusOutsideFrame}>
        <SelectGroup>
          {options.map(option => (
            <SelectItem key={option.value} value={String(option.index)} disabled={option.disabled}
              textValue={option.dataset.label ?? option.text}>
              <span className="team-select-option">
                {renderLabel(option)}
                {option.dataset.description && <small>{option.dataset.description}</small>}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

// The editor still owns the select values and handles their change events.
export function mountTeamSelect(field: HTMLSelectElement) {
  let host = field.nextElementSibling
  if (!host?.matches(".team-select")) {
    host = document.createElement("span")
    host.className = "team-select"
    host.setAttribute("data-team-control", "")
    field.after(host)
  }
  renderControl(host, <TeamSelect field={field} />)
  field.hidden = true
}
