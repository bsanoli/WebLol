import { describe, expect, it } from "vitest"
import { createCompositionCopy } from "./composition"
import { blank } from "./local-state"

describe("createCompositionCopy", () => {
  it("cria a cópia com novo id, nome com (cópia) e data informada", () => {
    const source = blank("Luta em time")
    const copy = createCompositionCopy(source, "nova", 123)
    expect(copy).toMatchObject({ id: "nova", name: "Luta em time (cópia)", updated: 123 })
    expect(source.name).toBe("Luta em time")
  })

  it("não compartilha listas com a original", () => {
    const source = blank()
    source.lanes.top = ["Ornn"]
    const copy = createCompositionCopy(source, "nova", 1)
    copy.lanes.top.push("Sion")
    expect(source.lanes.top).toEqual(["Ornn"])
  })
})
