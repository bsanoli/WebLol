import { createElement } from "react"
import { LANES } from "@/entities/match"
import { laneIconFile } from "@/shared/ui/icon"
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group"
import type { Champion } from "../model/build-statistics"

/** Posição das builds: nome de uma rota ou vazio para todas. */
export type Lane = keyof Champion["lanes"] | ""
export const toLane = (value: string) => (LANES.some(([name]) => name === value) ? (value as Lane) : "")

const buildLaneIcon = (lane: string) => {
  if (!lane) {
    return createElement(
      "svg",
      { className: "icon", "aria-hidden": true, focusable: false },
      createElement("use", { href: "assets/icons.svg#layers" }),
    )
  }
  const file = laneIconFile(lane)
  return file
    ? createElement("img", { className: "lane-icon", src: `assets/lanes/${file}.svg`, width: 16, height: 16, alt: "" })
    : null
}
export function positionFilter(
  lanes: string[],
  current: string,
  label: string,
  shouldShowNames: boolean,
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
        createElement("span", null, buildLaneIcon(lane)),
        shouldShowNames ? lane || "Todas" : null,
      ),
    ),
  )
}
