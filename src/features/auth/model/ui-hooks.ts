// O que a sincronização pede à tela. Por padrão não faz nada; `startPanel` liga as telas de verdade,
// assim `model` não importa de `ui`.
type SetSync = (text: string, kind: "" | "ok" | "warn" | "bad") => void

export const uiHooks = {
  renderAdmin: (() => {}) as () => void,
  setSync: (() => {}) as SetSync,
  updateStatus: (() => {}) as (keepChip?: boolean) => void,
}

export function bindUiHooks(hooks: typeof uiHooks) {
  Object.assign(uiHooks, hooks)
}
