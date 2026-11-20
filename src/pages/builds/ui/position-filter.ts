import { createElement } from "react"
import { LANES } from "@/entities/match"
import { iconMarkup, laneIconMarkup } from "@/shared/ui/icon"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import type { Champion } from "../model/build-statistics"

/** Posição das builds: nome de uma rota ou vazio para todas. */
export type Lane = keyof Champion["lanes"] | ""
export const toLane = (value: string) => (LANES.some(([name]) => name === value) ? (value as Lane) : "")

const buildLaneIcon = (lane: string) => (lane ? laneIconMarkup(lane) : iconMarkup("layers"))
export function positionFilter(
  lanes: string[],
  current: string,
  label: string,
  showNames: boolean,
  change: (lane: string) => void,
) {
  return createElement(
    ToggleGroup,
    {
      type: "single",
      value: current || "all",
      spacing: 1,
      size: "sm",
      className: "build-lane-tabs",
      "aria-label": label,
      onValueChange: (value: string) => {
        if (value) change(value === "all" ? "" : value)
      },
    },
    lanes.map(lane =>
      createElement(
        ToggleGroupItem,
        {
          key: lane,
          value: lane || "all",
          title: lane || "Todas as posições",
          "aria-label": lane || "Todas as posições",
          ...{ "data-lane": lane, "data-slot": "button", "data-variant": "ghost" },
        },
        createElement("span", { dangerouslySetInnerHTML: { __html: buildLaneIcon(lane) } }),
        showNames ? lane || "Todas" : null,
      ),
    ),
  )
}
