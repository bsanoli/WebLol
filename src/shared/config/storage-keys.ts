/**
 * Chaves do `localStorage` do WebLol e o formato de cada valor.
 *
 * São contratos (docs/glossario.md, "Nomes salvos"): trocar o nome ou o formato perde os dados de quem
 * já usa o app, então só mudam com migração e ADR. Os nomes das propriedades são os nomes canônicos do
 * glossário. "JSON" quer dizer que o valor passa por `JSON.stringify`; "Texto" é gravado como está.
 *
 * O teste `storage-keys.test.ts` confere que toda chave usada no código está declarada aqui.
 */
export const STORAGE_KEYS = {
  /** JSON `{ comps, plays, tactics, view, cur, curPlay }`: estado da Área do time. Escrito pela Área do time e por `features/auth`. */
  teamAreaState: "lol-comps-time-v1",
  /** JSON `true`: a pessoa usa a Área do time sem conta, e as alterações valem só nesta visita. */
  guestState: "lol-guest",
  /** JSON `{ id: "Nome#TAG", admin: boolean, created: number, solo?: boolean }`: conta conectada. */
  account: "lol-user",
  /** JSON `string`: id do time da conta, ou `"__guest__"` sem time. */
  team: "lol-team",
  /** JSON `{ version: number, data: { comps, plays, tactics? } }`: última versão oficial do time, base das mudanças pendentes. */
  officialBaseline: "lol-base",
  /** JSON `string[]`: hashes das mudanças já enviadas para aprovação (os 500 mais recentes). */
  lastSubmission: "lol-sent",
  /** JSON `string`: impressão digital da chave do admin aceita neste navegador. */
  adminKeyFingerprint: "lol-admin-fp",
  /** JSON `string`: id do time que o admin está vendo. */
  adminViewedTeam: "lol-admin-view-team",
  /** JSON `"" | "guest" | "user" | "captain"`: modo "Ver como" do admin. */
  previewAs: "lol-preview",
  /** JSON `Record<chave, string | null>`: valores reais de `teamAreaState`, `officialBaseline`, `lastSubmission` e `team` guardados durante o "Ver como". */
  previewBackup: "lol-preview-backup",
  /** JSON `string[]`: ids dos prints de tática que ainda não foram enviados ao time (os 300 mais recentes). */
  pendingScreenshots: "lol-img-pendentes",
  /** Texto: id da paleta (`PaletteId`). O nome é de quando os temas existiam só em Composições. */
  palette: "weblol-composition-palette",
  /** Texto: tamanho do cursor do Mapa tático, em px. */
  mapCursorSize: "weblol-map-cursor-size",
  /** Texto: id da cor do cursor do Mapa tático. */
  mapCursorColor: "weblol-map-cursor-color",
  /** Texto: tamanho dos campeões no Mapa tático, de 60 a 100. */
  mapChampionSize: "weblol-map-champion-size",
} as const

/** Chaves que terminam com um id. */
export const STORAGE_PREFIXES = {
  /** Texto (data URL): print de tática guardado neste navegador, em `lol-img-<id>`. */
  screenshotCache: "lol-img-",
} as const

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
