import type { Composition } from "./local-state";

export function createCompositionCopy(source: Composition, id: string, updated: number): Composition {
  return {
    ...structuredClone(source),
    id,
    name: `${source.name} (cópia)`,
    updated,
  };
}
