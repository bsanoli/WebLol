import { createElement } from "react"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"

export const createStageSelect = (stages: string[], value: string, onValueChange: (value: string) => void) =>
  createElement(
    Select,
    { value, onValueChange },
    createElement(
      SelectTrigger,
      {
        id: "cs",
        className: "comp-picker-trigger comp-stage-trigger",
        ...{ "data-slot": "button", "data-variant": "outline" },
        "aria-labelledby": "comp-stage-label cs",
      },
      createElement(SelectValue),
    ),
    createElement(
      SelectContent,
      {
        className: "team-select-panel",
        position: "popper",
        align: "start",
        collisionPadding: 8,
      },
      createElement(
        SelectGroup,
        null,
        createElement(SelectItem, { value: "all" }, "Todas as fases"),
        ...stages.map(stage => createElement(SelectItem, { key: stage, value: stage }, stage)),
      ),
    ),
  )
