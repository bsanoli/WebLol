import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import { showBuildOption } from "./build-options"

/** Raízes React montadas dentro do HTML das builds, descartadas a cada redesenho. */
export const buildControlRoots = new Map<Element, Root>()

export function disposeBuildControls() {
  for (const root of buildControlRoots.values()) root.unmount()
  buildControlRoots.clear()
}

export function mountSkillOptions(container: ParentNode) {
  for (const host of container.querySelectorAll<HTMLElement>(".build-skill-options")) {
    if (buildControlRoots.has(host)) continue
    const options = [...host.querySelectorAll<HTMLElement>("[data-skill-sequence]")].map(button => ({
      value: button.dataset.skillSequence ?? "",
      label: button.textContent,
    }))
    const panels = host.closest(".build-skills")?.querySelectorAll<HTMLElement>("[data-skill-panel]")
    if (!panels) continue
    const root = createRoot(host)
    buildControlRoots.set(host, root)
    const select = (value: string) => {
      if (!value) return
      showBuildOption(panels, "skillPanel", value)
      root.render(
        createElement(
          ToggleGroup,
          {
            type: "single",
            value,
            spacing: 1,
            "aria-label": "Sequências mais frequentes",
            onValueChange: select,
          },
          options.map(option =>
            createElement(
              ToggleGroupItem,
              {
                key: option.value,
                value: option.value,
                ...{ "data-slot": "button", "data-variant": "outline", "data-size": "sm" },
              },
              option.label,
            ),
          ),
        ),
      )
    }
    select("0")
  }
}
