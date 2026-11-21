import { $ } from "@/shared/lib/dom"
import { mountMapContextMenu } from "./map-context-menu"
import { mapQuickTools, type Tool } from "./map-tools"
import type { MapRuntime } from "./map-runtime"

type ToolContextMenuDeps = {
  map: Parameters<typeof mountMapContextMenu>[0]
  viewport: HTMLElement
  selectTool: (tool: Tool, focusCursor: boolean) => void
  showToolOptions: () => void
}

/** Menu de contexto do mapa: ações da camada sob o cursor, ferramentas rápidas e histórico. */
export function mountMapToolContextMenu(
  { session: M, canChangeFrame, layers }: MapRuntime,
  { map, viewport, selectTool, showToolOptions }: ToolContextMenuDeps,
) {
  const historyActions = [
    { label: "Desfazer", icon: "undo", button: $<HTMLButtonElement>("#undo"), startsHistory: true },
    { label: "Refazer", icon: "redo", button: $<HTMLButtonElement>("#redo") },
  ]
  return mountMapContextMenu(
    map,
    viewport,
    event => {
      if (!canChangeFrame()) return
      return (
        layers.wardLayer.contextAction(event) ??
        layers.battlefield.contextAction(event, "wave") ??
        layers.battlefield.contextAction(event, "tower") ??
        (event instanceof MouseEvent ? layers.drawing.contextAction(event) : undefined)
      )
    },
    () =>
      canChangeFrame()
        ? [
            ...mapQuickTools.map(tool => ({
              label: tool.label,
              icon: tool.icon,
              selected: M.tool === tool.value,
              run: () => {
                if (M.tool !== tool.value) selectTool(tool.value, false)
                else showToolOptions()
              },
            })),
            ...historyActions.map(({ button, ...action }) => ({
              ...action,
              disabled: button.disabled,
              run: () => button.click(),
            })),
          ]
        : [],
  )
}
