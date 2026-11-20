import { useState } from "react"
import { createRoot } from "react-dom/client"

import { STORAGE_KEYS } from "@/shared/config/storage-keys"
import { Label } from "@/shared/ui/label"
import { Slider } from "@/shared/ui/slider"

const sizeKey = STORAGE_KEYS.mapChampionSize
const min = 60
const max = 100
const step = 1
const labelId = "map-champion-size-label"

function readSize() {
  try {
    const saved = Number(localStorage.getItem(sizeKey))
    if (saved >= min && saved <= max) return min + Math.round((saved - min) / step) * step
  } catch {}
  return min
}

function ChampionSize({ initial, apply }: { initial: number; apply: (size: number) => void }) {
  const [value, setValue] = useState(initial)
  const progress = (value - min) / (max - min)

  return (
    <div className="grid gap-2">
      <Label id={labelId}>Tamanho dos ícones</Label>
      <div className="relative mx-4 pt-6">
        <div
          aria-hidden="true"
          className="bg-foreground text-background absolute top-0 rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
          style={{
            left: `calc(var(--spacing) * 2 + (100% - var(--spacing) * 4) * ${progress})`,
            transform: "translateX(-50%)",
          }}
        >
          {value}%
          <div className="bg-foreground absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45" />
        </div>
        <Slider
          className="min-h-6"
          value={[value]}
          onValueChange={([size]) => {
            setValue(size)
            apply(size)
          }}
          onValueCommit={([size]) => {
            try {
              localStorage.setItem(sizeKey, String(size))
            } catch {}
          }}
          min={min}
          max={max}
          step={step}
          thumbProps={{ "aria-labelledby": labelId, "aria-valuetext": `${value}%` }}
        />
      </div>
    </div>
  )
}

export function mountChampionSize(host: HTMLElement, map: HTMLElement) {
  const initial = readSize()
  const apply = (size: number) => map.style.setProperty("--map-champion-scale", String(size / 100))
  apply(initial)
  createRoot(host).render(<ChampionSize initial={initial} apply={apply} />)
}
