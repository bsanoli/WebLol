import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/arc"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import { Fragment, useEffect, useReducer, useState } from "react"
import type { ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { MoreHorizontal } from "lucide-react"
import { ContextMenu } from "radix-ui"
import { Switch } from "@/shared/ui/arc"
import { Empty, EmptyDescription, EmptyHeader } from "@/shared/ui/empty"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"
import { requireElement } from "@/shared/lib/dom"

const roots = new WeakMap<Element, Root>()

export function renderControl(host: Element, control: ReactNode) {
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

export function Icon({ name }: { name: string }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`assets/icons.svg#${name}`} />
    </svg>
  )
}

export function mountDraftChampionMenu(host: HTMLElement, name: string, remove: () => void) {
  const button = requireElement<HTMLButtonElement>("button", host)
  const { priority, lane } = button.dataset
  const content = Array.from(button.childNodes)
  renderControl(
    host,
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <button
          type="button"
          className={button.className}
          data-priority={priority}
          data-lane={lane}
          aria-label={button.getAttribute("aria-label") ?? name}
          title={button.title}
          ref={node => node?.replaceChildren(...content.map(child => child.cloneNode(true)))}
        />
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="chip-menu" aria-label={name}>
          <ContextMenu.Item
            data-slot="dropdown-menu-item"
            data-variant="destructive"
            onSelect={() => queueMicrotask(remove)}
          >
            <Icon name="trash" /> Excluir {name}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>,
  )
}

export function mountMapEmpty(host: Element) {
  renderControl(
    host,
    <Empty className="map-empty">
      <EmptyHeader>
        <EmptyDescription>Nenhum passo ainda.</EmptyDescription>
      </EmptyHeader>
    </Empty>,
  )
}

export function mountMapSwitch(
  host: Element,
  label: string,
  isChecked: boolean,
  onCheckedChange: (checked: boolean) => void,
  isDisabled = false,
) {
  renderControl(
    host,
    <Switch
      className="map-check"
      label={label}
      checked={isChecked}
      disabled={isDisabled}
      onCheckedChange={onCheckedChange}
    />,
  )
}

export type MenuAction = {
  label: string
  icon: ReactNode
  disabled?: boolean
  destructive?: boolean
  run: () => void
}

// A click in the parent shell blurs this iframe without dispatching a pointer event here.
export function useTeamOverlay() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("blur", close)
    return () => window.removeEventListener("blur", close)
  }, [open])
  return { open, setOpen }
}

export function keepFocusOutsideFrame(event: Event) {
  if (!document.hasFocus()) event.preventDefault()
}

export function ActionMenu({ label, heading, actions }: { label: string; heading?: string; actions: MenuAction[] }) {
  const { open, setOpen } = useTeamOverlay()
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger data-team-trigger="icon" aria-label={label}>
        <MoreHorizontal aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="team-menu"
        align="end"
        collisionPadding={8}
        onCloseAutoFocus={keepFocusOutsideFrame}
      >
        <DropdownMenuGroup>
          {heading && <DropdownMenuLabel>{heading}</DropdownMenuLabel>}
          {actions.map(({ label, icon, disabled, destructive, run }) => (
            <Fragment key={label}>
              {destructive && <DropdownMenuSeparator />}
              <DropdownMenuItem
                disabled={disabled}
                variant={destructive ? "destructive" : "default"}
                onSelect={() => queueMicrotask(run)}
              >
                {icon}
                {label}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function TeamSelect({ field }: { field: HTMLSelectElement }) {
  const { open, setOpen } = useTeamOverlay()
  const [, refresh] = useReducer((version: number) => version + 1, 0)
  const [portalContainer, setPortalContainer] = useState<HTMLElement>()
  const options = Array.from(field.options)
  const selected = options[field.selectedIndex]
  const isLaneSelect = field.dataset.teamSelect === "lane"
  const compact = field.hasAttribute("data-pick-position")

  function renderLabel(option: HTMLOptionElement) {
    return (
      <>
        {isLaneSelect && option.value !== "ban" && (
          <img className="lane-icon" src={`assets/lanes/${option.value}.svg`} alt="" />
        )}
        <span className="team-select-label">{option.dataset.label ?? option.text}</span>
      </>
    )
  }

  return (
    <Select
      open={open}
      value={selected ? String(selected.index) : ""}
      disabled={field.disabled || options.length === 0}
      onOpenChange={nextOpen => {
        if (nextOpen)
          setPortalContainer(
            field.closest<HTMLElement>('[role="dialog"], #v-map:fullscreen, #v-map.map-expanded') ?? undefined,
          )
        setOpen(nextOpen)
      }}
      onValueChange={value => {
        field.selectedIndex = Number(value)
        refresh()
        queueMicrotask(() => field.dispatchEvent(new Event("change", { bubbles: true })))
      }}
    >
      <SelectTrigger
        id={field.id ? `${field.id}-trigger` : undefined}
        size={compact ? "sm" : "default"}
        data-team-trigger="select"
        aria-label={field.getAttribute("aria-label") ?? undefined}
        aria-labelledby={field.getAttribute("aria-labelledby") ?? undefined}
      >
        <SelectValue>{selected ? renderLabel(selected) : "Sem opções"}</SelectValue>
      </SelectTrigger>
      <SelectContent
        className="team-select-panel"
        position="popper"
        align="start"
        sideOffset={4}
        collisionPadding={8}
        portalContainer={portalContainer}
        onCloseAutoFocus={keepFocusOutsideFrame}
      >
        <SelectGroup>
          {options.map(option => (
            <SelectItem
              key={option.value}
              value={String(option.index)}
              disabled={option.disabled}
              textValue={option.dataset.label ?? option.text}
            >
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
type SectionOption = { value: string; label: string; icon?: string; image?: string; panel?: string }

export function mountSectionTabs(
  host: Element,
  label: string,
  value: string,
  options: SectionOption[],
  change: (value: string) => void,
  variant: "underline" | "navigation" = "underline",
) {
  renderControl(
    host,
    <Tabs value={value} onValueChange={change} activationMode="manual" data-variant={variant}>
      <TabsList aria-label={label} slidingHover={variant === "navigation"}>
        {options.map(option => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            id={`tab-${option.value}`}
            aria-controls={option.panel ?? `panel-${option.value}`}
          >
            {option.icon && <Icon name={option.icon} />}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>,
  )
}

export function mountToolGroup(
  host: Element,
  value: string,
  options: (SectionOption & { shortcuts?: string })[],
  change: (value: string) => void,
  isDisabled = false,
) {
  renderControl(
    host,
    <ToggleGroup
      type="single"
      value={value}
      spacing={1}
      disabled={isDisabled}
      className="map-modes seg"
      aria-label="Modo da ferramenta"
      onValueChange={next => change(next || value)}
    >
      {options.map(option => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          data-slot="button"
          data-variant="ghost"
          data-tool={option.value}
          aria-label={option.label}
          aria-controls={option.panel}
          aria-keyshortcuts={option.shortcuts}
          data-map-tip={
            option.shortcuts ? `${option.label} (${option.shortcuts.replaceAll(" ", " / ")})` : option.label
          }
        >
          {option.image ? (
            <img className="map-tool-image" src={option.image} alt="" />
          ) : (
            option.icon && <Icon name={option.icon} />
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>,
  )
}
