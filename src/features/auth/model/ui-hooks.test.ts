import { describe, expect, it, vi } from "vitest"
import { bindUiHooks, uiHooks } from "./ui-hooks"

describe("uiHooks", () => {
  it("começam sem efeito e passam a chamar o que foi ligado", () => {
    expect(() => uiHooks.renderAdmin()).not.toThrow()
    const setSync = vi.fn()
    bindUiHooks({ ...uiHooks, setSync })
    uiHooks.setSync("ok", "ok")
    expect(setSync).toHaveBeenCalledWith("ok", "ok")
  })
})
