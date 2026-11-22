import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { Placeholder } from "@tiptap/extensions"
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef } from "react"
import type { EditorView } from "@tiptap/pm/view"
import { Button } from "@/shared/ui/button"
import type { PrintStore } from "../../api/print-store"
import { printNode, type TacticDoc, type TacticPrintAttrs } from "../../model/tactic-doc"
import { championMention, type NoteChampion } from "./champion-mention"
import { TacticPrint } from "./print-node"

export type TacticNotesProps = {
  doc: TacticDoc
  labelledBy: string
  champions: NoteChampion[]
  store: PrintStore
  compressImage: (file: Blob) => Promise<string>
  sketch: (attrs: TacticPrintAttrs) => Promise<Pick<TacticPrintAttrs, "sketch" | "preview"> | null>
  onChange: (doc: TacticDoc) => void
  toast: (message: string) => void
}

const SAVE_DELAY = 400

const imagesOf = (files: FileList | File[] | null | undefined) =>
  [...(files ?? [])].filter(file => file.type.startsWith("image/"))

type ToolProps = { label: string; icon: LucideIcon; active?: boolean; disabled?: boolean; onClick: () => void }

function Tool({ label, icon: Icon, active, disabled, onClick }: ToolProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="tx-tool"
      aria-label={label}
      title={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={event => event.preventDefault()}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </Button>
  )
}

function Toolbar({ editor, onAddPrint }: { editor: Editor; onAddPrint: () => void }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      undo: e.can().undo(),
      redo: e.can().redo(),
    }),
  })
  const run = () => editor.chain().focus()
  return (
    <div className="tx-toolbar" role="toolbar" aria-label="Formatação da tática">
      <div className="tx-tool-group">
        <Tool label="Negrito (Ctrl+B)" icon={Bold} active={state.bold} onClick={() => run().toggleBold().run()} />
        <Tool label="Itálico (Ctrl+I)" icon={Italic} active={state.italic} onClick={() => run().toggleItalic().run()} />
      </div>
      <div className="tx-tool-group">
        <Tool
          label="Título"
          icon={Heading2}
          active={state.h2}
          onClick={() => run().toggleHeading({ level: 2 }).run()}
        />
        <Tool
          label="Subtítulo"
          icon={Heading3}
          active={state.h3}
          onClick={() => run().toggleHeading({ level: 3 }).run()}
        />
      </div>
      <div className="tx-tool-group">
        <Tool label="Lista" icon={List} active={state.bullet} onClick={() => run().toggleBulletList().run()} />
        <Tool
          label="Lista numerada"
          icon={ListOrdered}
          active={state.ordered}
          onClick={() => run().toggleOrderedList().run()}
        />
        <Tool
          label="Lista de tarefas"
          icon={ListChecks}
          active={state.task}
          onClick={() => run().toggleTaskList().run()}
        />
      </div>
      <div className="tx-tool-group">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="tx-tool-print"
          onMouseDown={event => event.preventDefault()}
          onClick={onAddPrint}
        >
          <ImagePlus aria-hidden="true" /> Adicionar print
        </Button>
      </div>
      <div className="tx-tool-group tx-tool-history">
        <Tool label="Desfazer (Ctrl+Z)" icon={Undo2} disabled={!state.undo} onClick={() => run().undo().run()} />
        <Tool label="Refazer (Ctrl+Shift+Z)" icon={Redo2} disabled={!state.redo} onClick={() => run().redo().run()} />
      </div>
    </div>
  )
}

/** Bloco de notas da tática: texto rico, `@campeão` e prints com desenho por cima. */
export function TacticNotes(props: TacticNotesProps) {
  const latest = useRef(props)
  latest.current = props
  const fileInput = useRef<HTMLInputElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const emitted = useRef(JSON.stringify(props.doc))
  const editorRef = useRef<Editor | null>(null)

  const flush = useCallback(() => {
    if (timer.current === undefined) return
    window.clearTimeout(timer.current)
    timer.current = undefined
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return
    const doc = editor.getJSON() as TacticDoc
    emitted.current = JSON.stringify(doc)
    latest.current.onChange(doc)
  }, [])

  // Comprime e guarda cada imagem e insere os prints na posição indicada (ou no cursor).
  const insertPrints = async (files: File[], at?: number) => {
    const { store, compressImage, toast } = latest.current
    const editor = editorRef.current
    if (!editor || !files.length) return
    const nodes = []
    let isLocalOnly = false,
      failed = ""
    for (const file of files) {
      try {
        const result = await store.save(await compressImage(file))
        nodes.push(printNode(result.id))
        if (!result.shared) isLocalOnly = true
        if (result.error) failed = result.error
      } catch (error) {
        failed = error instanceof Error ? error.message : "erro"
      }
    }
    if (!nodes.length) {
      toast(`Não consegui adicionar o print (${failed}).`)
      return
    }
    const chain = editor.chain().focus()
    if (at === undefined) chain.insertContent(nodes).run()
    else chain.insertContentAt(at, nodes).run()
    toast(
      failed
        ? "Não consegui enviar o print ao time agora. Ele será reenviado na próxima sincronização."
        : isLocalOnly
          ? "Print salvo neste navegador. Ele vai para o time quando você sincronizar com um time."
          : nodes.length > 1
            ? `${nodes.length} prints adicionados`
            : "Print adicionado",
    )
  }

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: false, code: false, codeBlock: false }),
      TaskList,
      TaskItem.configure({
        nested: true,
        a11y: {
          checkboxLabel: (node, checked) =>
            `${checked ? "Desmarcar" : "Marcar"} tarefa: ${node.textContent || "tarefa vazia"}`,
        },
      }),
      Placeholder.configure({ placeholder: "Escreva a tática… Use @ para citar um campeão e cole prints com Ctrl+V." }),
      championMention(props.champions),
      TacticPrint.configure({
        store: {
          save: data => latest.current.store.save(data),
          load: (id, fresh) => latest.current.store.load(id, fresh),
          isPending: id => latest.current.store.isPending?.(id) ?? false,
          retry: () => latest.current.store.retry?.() ?? Promise.resolve(0),
        },
        sketch: attrs => latest.current.sketch(attrs),
      }),
    ],
    [props.champions],
  )

  const editor = useEditor(
    {
      extensions,
      // Se o editor for recriado (outras extensões), começa do último conteúdo emitido, não do documento da montagem.
      content: JSON.parse(emitted.current) as TacticDoc,
      editorProps: {
        attributes: {
          class: "tx-notes-content",
          role: "textbox",
          "aria-multiline": "true",
          "aria-labelledby": props.labelledBy,
        },
        handlePaste: (_view, event) => {
          const files = imagesOf(event.clipboardData?.files)
          if (!files.length) return false
          event.preventDefault()
          void insertPrints(files)
          return true
        },
        handleDrop: (view: EditorView, event, _slice, moved) => {
          if (moved) return false
          const files = imagesOf(event.dataTransfer?.files)
          if (!files.length) return false
          event.preventDefault()
          const at = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
          void insertPrints(files, at)
          return true
        },
      },
      onUpdate: () => {
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, SAVE_DELAY)
      },
    },
    [extensions],
  )
  editorRef.current = editor

  // Mudança vinda de fora (outro membro do time): troca o conteúdo se a pessoa não estiver digitando.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const incoming = JSON.stringify(props.doc)
    if (incoming === emitted.current || editor.isFocused || timer.current !== undefined) return
    emitted.current = incoming
    editor.commands.setContent(props.doc, { emitUpdate: false })
  }, [editor, props.doc])

  useEffect(() => {
    window.addEventListener("pagehide", flush)
    return () => {
      window.removeEventListener("pagehide", flush)
      flush()
    }
  }, [flush])

  return (
    <div className="tx-notes">
      {editor && <Toolbar editor={editor} onAddPrint={() => fileInput.current?.click()} />}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={event => {
          const files = imagesOf(event.currentTarget.files)
          event.currentTarget.value = ""
          void insertPrints(files)
        }}
      />
      <EditorContent editor={editor} className="tx-notes-body" />
      <p className="tx-notes-hint">Clique num print para desenhar por cima. Arraste imagens para dentro do texto.</p>
    </div>
  )
}
