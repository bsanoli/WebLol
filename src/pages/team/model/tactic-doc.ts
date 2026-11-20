// Documento da tática: JSON do editor de texto (Tiptap). Os prints entram como nós `tacticPrint`
// que guardam só ids; a imagem, a cena do desenho e a prévia ficam à parte (times/{time}/imagens).

export type TacticDocNode = {
  type: string
  attrs?: Record<string, unknown>
  content?: TacticDocNode[]
  text?: string
  marks?: { type: string; attrs?: Record<string, unknown> }[]
}

export type TacticDoc = { type: "doc"; content: TacticDocNode[] }

export type TacticPrintAttrs = { src: string; sketch: string | null; preview: string | null }

export const TACTIC_PRINT = "tacticPrint"

const paragraph = (text: string): TacticDocNode =>
  text ? { type: "paragraph", content: [{ type: "text", text }] } : { type: "paragraph" }

export const printNode = (src: string): TacticDocNode => ({
  type: TACTIC_PRINT,
  attrs: { src, sketch: null, preview: null },
})

/** Valida o documento vindo do armazenamento; qualquer coisa estranha vira nulo. */
export function readTacticDoc(value: unknown): TacticDoc | null {
  const doc = value as TacticDoc | null
  return doc && doc.type === "doc" && Array.isArray(doc.content) ? doc : null
}

/** Converte a tática antiga (texto puro + prints soltos) num documento: uma linha por parágrafo e os prints no fim. */
export function docFromLegacy(text: string, images: string[]): TacticDoc {
  const lines = text ? text.split(/\r?\n/) : []
  const content = lines.map(paragraph)
  for (const id of images) content.push(printNode(id))
  if (!content.length) content.push(paragraph(""))
  return { type: "doc", content }
}

const heading = (text: string): TacticDocNode => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
})

export type CompNotes = { general: string; draft: { label: string; text: string }[] }

/** Põe as anotações antigas da comp (Plano geral e Plano do draft) no início do documento. */
export function docWithCompNotes(doc: TacticDoc, notes: CompNotes): TacticDoc {
  const blocks: TacticDocNode[] = []
  const section = (title: string, text: string) => {
    if (!text.trim()) return
    blocks.push(heading(title), ...text.split(/\r?\n/).map(paragraph))
  }
  section("Plano geral", notes.general)
  for (const { label, text } of notes.draft) section(`Plano do draft · ${label}`, text)
  if (!blocks.length) return doc
  const rest =
    doc.content.length === 1 && doc.content[0].type === "paragraph" && !doc.content[0].content?.length
      ? []
      : doc.content
  return { type: "doc", content: [...blocks, ...rest, ...(rest.length ? [] : [paragraph("")])] }
}

function walk(nodes: TacticDocNode[] | undefined, visit: (node: TacticDocNode) => void) {
  for (const node of nodes ?? []) {
    visit(node)
    walk(node.content, visit)
  }
}

const BLOCKS = new Set(["paragraph", "heading", "listItem", "taskItem", "blockquote", "codeBlock"])

/** Texto puro do documento, usado no resumo da aprovação e para saber se a tática tem conteúdo. */
export function plainTextOf(doc: TacticDoc): string {
  const out: string[] = []
  const visit = (node: TacticDocNode) => {
    if (node.type === "text") out.push(node.text ?? "")
    else if (node.type === "mention") out.push(`@${String(node.attrs?.label ?? node.attrs?.id ?? "")}`)
    else if (node.type === "hardBreak") out.push("\n")
    if (node.content) node.content.forEach(visit)
    if (BLOCKS.has(node.type) && !node.content?.some(child => BLOCKS.has(child.type))) out.push("\n")
  }
  doc.content.forEach(visit)
  return out
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Ids de todas as imagens referenciadas (print original, cena do desenho e prévia). */
export function collectImageIds(doc: TacticDoc): string[] {
  const ids = new Set<string>()
  walk(doc.content, node => {
    if (node.type !== TACTIC_PRINT) return
    const { src, sketch, preview } = (node.attrs ?? {}) as Partial<TacticPrintAttrs>
    for (const id of [src, sketch, preview]) if (typeof id === "string" && id) ids.add(id)
  })
  return [...ids]
}
