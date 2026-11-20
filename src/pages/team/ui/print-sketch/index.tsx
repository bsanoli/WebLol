import { createRoot } from "react-dom/client"
import { showDialog } from "@/shared/ui/dialog-controls"
import type { PrintStore } from "../../api/print-store"
import type { TacticPrintAttrs } from "../../model/tactic-doc"
import type { SketchScene } from "./print-sketch"

type SketchResult = Pick<TacticPrintAttrs, "sketch" | "preview">

type OpenSketchOptions = {
  attrs: TacticPrintAttrs
  store: PrintStore
  compressImage: (file: Blob) => Promise<string>
  toast: (message: string) => void
}

function readScene(json: string | null): SketchScene | null {
  if (!json) return null
  try {
    const scene = JSON.parse(json) as SketchScene
    return scene?.v === 1 && Array.isArray(scene.elements) ? scene : null
  } catch {
    return null
  }
}

function imageSize(dataURL: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => reject(new Error("Imagem inválida"))
    image.src = dataURL
  })
}

/** Abre o Excalidraw sobre o print. Salvar grava a cena e a prévia como imagens novas e devolve os ids. */
export async function openPrintSketch({
  attrs,
  store,
  compressImage,
  toast,
}: OpenSketchOptions): Promise<SketchResult | null> {
  const [background, sceneJson, module] = await Promise.all([
    store.load(attrs.src),
    attrs.sketch ? store.load(attrs.sketch) : Promise.resolve(null),
    import("./print-sketch"),
  ])
  if (!background) {
    toast("Este print ainda não chegou ao time.")
    return null
  }
  const size = await imageSize(background)
  const { PrintSketch } = module

  return new Promise(resolve => {
    const host = document.createElement("div")
    host.className = "tx-sketch-host"
    const root = createRoot(host)
    let result: SketchResult | null = null
    const close = showDialog({
      title: "Desenhar no print",
      children: host,
      className: "wl-panel tx-sketch-dialog",
      dismissible: false,
      onClose: () => {
        queueMicrotask(() => root.unmount())
        resolve(result)
      },
    })
    const handleSave = async ({ scene, image }: { scene: SketchScene; image: Blob }) => {
      try {
        const preview = await store.save(await compressImage(image))
        const sketch = await store.save(JSON.stringify(scene))
        result = { sketch: sketch.id, preview: preview.id }
        if (preview.error || sketch.error)
          toast("Não consegui enviar o desenho ao time agora. Ele será reenviado na próxima sincronização.")
        else toast("Desenho salvo")
        close()
      } catch (error) {
        toast(`Não consegui salvar o desenho (${error instanceof Error ? error.message : "erro"}).`)
      }
    }
    root.render(
      <PrintSketch
        srcId={attrs.src}
        background={background}
        size={size}
        scene={readScene(sceneJson)}
        onSave={handleSave}
        onCancel={close}
      />,
    )
  })
}
