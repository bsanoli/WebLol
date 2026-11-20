// Histórico de mudanças da interface, mostrado só na aba Administração.
// A cada mudança visível, acrescente uma versão no topo da lista em ui-versions.json.
// Os dados ficam em JSON para o histórico crescer sem esbarrar no limite de linhas dos módulos.
import versions from "./ui-versions.json"

export interface UiVersion {
  version: string
  date: string // AAAA-MM-DD
  changes: string[]
}

export const UI_VERSIONS: UiVersion[] = versions
