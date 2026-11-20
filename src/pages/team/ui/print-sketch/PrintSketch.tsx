import { Excalidraw, MainMenu, convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw"
import type { ExcalidrawImperativeAPI, BinaryFileData } from "@excalidraw/excalidraw/types"
import type { ExcalidrawElement, FileId } from "@excalidraw/excalidraw/element/types"
import "@excalidraw/excalidraw/index.css"
import { useMemo, useRef, useState } from "react"
import { Button } from "@/shared/ui/button"

export type SketchScene = { v: 1; elements: readonly ExcalidrawElement[] }

export type PrintSketchProps = {
  srcId: string
  background: string
  size: { width: number; height: number }
  scene: SketchScene | null
  onSave: (result: { scene: SketchScene; image: Blob }) => Promise<void>
  onCancel: () => void
}

const mimeOf = (dataURL: string) => (/^data:([^;,]+)/.exec(dataURL)?.[1] ?? "image/png") as BinaryFileData["mimeType"]

/** Cena inicial: o print travado na origem e, por cima, os riscos já salvos. */
function initialElements({ srcId, size, scene }: Pick<PrintSketchProps, "srcId" | "size" | "scene">) {
  if (scene?.elements.length) return scene.elements
  return convertToExcalidrawElements([{
    type: "image", fileId: srcId as FileId, x: 0, y: 0, width: size.width, height: size.height, locked: true, status: "saved",
  }])
}

export function PrintSketch({ srcId, background, size, scene, onSave, onCancel }: PrintSketchProps) {
  const api = useRef<ExcalidrawImperativeAPI | null>(null)
  const [saving, setSaving] = useState(false)
  const initialData = useMemo(() => ({
    elements: initialElements({ srcId, size, scene }),
    files: { [srcId]: { id: srcId as FileId, dataURL: background as BinaryFileData["dataURL"], mimeType: mimeOf(background), created: Date.now() } },
    appState: { viewBackgroundColor: "#ffffff", currentItemStrokeColor: "#e03131", currentItemStrokeWidth: 2 },
    scrollToContent: true,
  }), [srcId, size, scene, background])

  const handleSave = async () => {
    const current = api.current
    if (!current || saving) return
    setSaving(true)
    try {
      const elements = current.getSceneElements()
      const image = await exportToBlob({
        elements, files: current.getFiles(), mimeType: "image/png", exportPadding: 0,
        appState: { exportBackground: true, viewBackgroundColor: "#ffffff", exportWithDarkMode: false },
      })
      await onSave({ scene: { v: 1, elements }, image })
    } finally {
      setSaving(false)
    }
  }

  return <div className="tx-sketch">
    <header className="tx-sketch-head">
      <h2>Desenhar no print</h2>
      <p>O print fica travado no fundo. Os riscos continuam editáveis quando você reabrir.</p>
      <div className="tx-sketch-actions">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="button" onClick={() => void handleSave()} disabled={saving}>{saving ? "Salvando…" : "Salvar desenho"}</Button>
      </div>
    </header>
    <div className="tx-sketch-canvas">
      <Excalidraw excalidrawAPI={value => { api.current = value }} initialData={initialData}
        theme="dark" langCode="pt-BR" UIOptions={{ canvasActions: { loadScene: false, saveToActiveFile: false, export: false, saveAsImage: false, toggleTheme: false }, tools: { image: false } }}>
        <MainMenu>
          <MainMenu.DefaultItems.Help />
        </MainMenu>
      </Excalidraw>
    </div>
  </div>
}
