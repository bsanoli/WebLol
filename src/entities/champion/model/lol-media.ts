import catalog from "@/data/lol.json"

export type RuneTree = { name: string; icon: string; slots: string[][] }

type CatalogLookup<T> = Readonly<Partial<Record<string, T>>>
export type BuildDetail = {
  name: string
  description: string
  effects?: CatalogLookup<string>
}

export const LOL_DATA: {
  champions: Record<string, { name: string; tags: string[]; portrait: string; splash: string }>
  item: CatalogLookup<string>
  itemDetails: CatalogLookup<BuildDetail>
  rune: CatalogLookup<string>
  runeNames: CatalogLookup<string>
  runeDescriptions: CatalogLookup<string>
  runeTrees: CatalogLookup<RuneTree>
  spell: CatalogLookup<string>
  spellDetails: CatalogLookup<BuildDetail>
  map: string
} = catalog
export const lolKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const lolChampions = new Map(Object.entries(LOL_DATA.champions).flatMap(([id, champion]) =>
  [[lolKey(id), champion], [lolKey(champion.name), champion]]));
export const lolChampion = (name: string) => lolChampions.get(lolKey(name));
export const lolAsset = (path: string) => `assets/${path}`;
// Visible labels or initials already identify every image in these panels.
export const lolImage = (path: string | undefined, className = "") => path
  ? `<img alt="" class="${className}" loading="lazy" src="${lolAsset(path)}" onerror="this.remove()">`
  : "";
