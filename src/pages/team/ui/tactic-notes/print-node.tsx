import { Node, NodeViewWrapper, ReactNodeViewRenderer, mergeAttributes, type ReactNodeViewProps } from "@tiptap/react"
import { PencilLine, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/shared/ui/button"
import type { PrintStore } from "../../api/print-store"
import { TACTIC_PRINT, type TacticPrintAttrs } from "../../model/tactic-doc"

export type PrintNodeOptions = {
  store: PrintStore
  /** Abre o editor de desenho; devolve os novos ids da cena e da prévia, ou nulo se cancelar. */
  sketch: (attrs: TacticPrintAttrs) => Promise<Pick<TacticPrintAttrs, "sketch" | "preview"> | null>
}

function PrintView({ node, updateAttributes, deleteNode, selected, extension }: ReactNodeViewProps) {
  const { store, sketch } = extension.options as PrintNodeOptions
  const attrs = node.attrs as TacticPrintAttrs
  const shown = attrs.preview || attrs.src
  const [data, setData] = useState<string | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // O editor recria as opções a cada render; ler da ref evita recarregar (e piscar) sem o print mudar.
  const storeRef = useRef(store)
  storeRef.current = store

  useEffect(() => {
    let isAlive = true
    void storeRef.current.load(shown, attempt > 0).then(value => {
      if (isAlive) setData(value)
    })
    return () => {
      isAlive = false
    }
  }, [shown, attempt])

  // Só o autor tem o print na fila de pendentes (a fila fica no navegador dele).
  const isMine = data === null && !!store.isPending?.(shown)

  const handleRetry = async () => {
    if (busy) return
    setBusy(true)
    try {
      await store.retry?.()
    } finally {
      setBusy(false)
      setData(undefined)
      setAttempt(count => count + 1)
    }
  }

  const handleDraw = async () => {
    if (busy || !data) return
    setBusy(true)
    try {
      const result = await sketch(attrs)
      if (result) updateAttributes(result)
    } finally {
      setBusy(false)
    }
  }

  return (
    <NodeViewWrapper className={`tx-print-node${selected ? " is-selected" : ""}`} data-drag-handle>
      {data === null ? (
        <div className="tx-print-missing" contentEditable={false}>
          {isMine ? (
            <>
              <p>Não enviado ao time. O print está só neste navegador e os outros ainda não o veem.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleRetry()} disabled={busy}>
                {busy ? "Enviando…" : "Tentar de novo"}
              </Button>
            </>
          ) : (
            <>
              <p>Aguardando o envio de quem adicionou este print. Ele aparece aqui quando chegar ao time.</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleRetry()} disabled={busy}>
                Verificar de novo
              </Button>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="tx-print-image"
          onClick={() => void handleDraw()}
          disabled={!data}
          aria-label={attrs.preview ? "Abrir o desenho deste print" : "Desenhar sobre este print"}
          title={attrs.preview ? "Abrir o desenho" : "Desenhar por cima"}
        >
          {data ? (
            <img src={data} alt={attrs.preview ? "Print com desenho" : "Print da tática"} draggable={false} />
          ) : (
            <span className="tx-print-loading">Carregando print…</span>
          )}
        </button>
      )}
      <div className="tx-print-tools" contentEditable={false}>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleDraw()} disabled={!data || busy}>
          <PencilLine aria-hidden="true" /> {attrs.preview ? "Editar desenho" : "Desenhar"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={deleteNode} aria-label="Remover print">
          <Trash2 aria-hidden="true" /> Remover
        </Button>
      </div>
    </NodeViewWrapper>
  )
}

/** Print dentro do texto: guarda só ids; a imagem, a cena do desenho e a prévia ficam à parte. */
export const TacticPrint = Node.create<PrintNodeOptions>({
  name: TACTIC_PRINT,
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return {
      store: { save: async () => ({ id: "", shared: false }), load: async () => null },
      sketch: async () => null,
    }
  },

  addAttributes() {
    return {
      src: { default: "" },
      sketch: { default: null },
      preview: { default: null },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure[data-tactic-print]",
        getAttrs: element => ({
          src: element.getAttribute("data-src") ?? "",
          sketch: element.getAttribute("data-sketch"),
          preview: element.getAttribute("data-preview"),
        }),
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, {
        "data-tactic-print": "",
        "data-src": node.attrs.src,
        "data-sketch": node.attrs.sketch,
        "data-preview": node.attrs.preview,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(PrintView)
  },
})
