// Edições de uma composição pela barra de confronto: renomear, excluir e o link do OP.GG.
import { askName, confirmAction } from "@/shared/ui/dialog-controls"
import { isEnemy, oursOf } from "../model/composition-side"
import { blank, type Composition } from "../model/local-state"
import { detachMissingComps, findMatchup, matchupsOfComp, matchupTitle, type Matchup } from "../model/matchups"
import { normalizeOpggLink, opggOf, setOpgg, writeTactic } from "../model/tactics"
import { $, cur, compById, S, save, toast, touch } from "./team-store"
import { boardEnemy, hooks, session } from "./team-session"

const entryOf = (matchup: Matchup) => {
  const { ours, enemy } = findMatchup(S.comps, S.matchups, matchup.id) ?? { ours: null, enemy: null }
  return { ours, enemy }
}
export const focusMatchup = (kind: "ours" | "rival") =>
  requestAnimationFrame(() => $(`#editor [data-matchup="${kind}"]`)?.focus({ preventScroll: true }))
// Nome editado direto no card do lado.
export function handleRenameTo(id: string, value: unknown) {
  const c = compById(id),
    name = String(value || "").trim()
  if (!c || !name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $<HTMLInputElement>("#cname").value = name
    $("#cname").title = name
  }
  hooks.renderEditor()
}
export async function renameComp(id: string) {
  const c = compById(id)
  if (!c) return
  const name = (await askName("Renomear composição", c.name, "Nome da composição"))?.trim()
  if (!name || name === c.name) return
  c.name = name
  touch(c)
  save()
  if (id === S.cur) {
    $<HTMLInputElement>("#cname").value = name
    $("#cname").title = name
  }
  hooks.renderEditor()
  focusMatchup(id === S.cur ? "ours" : "rival")
}
export async function deleteComp(id: string) {
  const c = compById(id)
  if (!c) return false
  const used = S.matchups.filter(item => item.ours === c.id || item.enemy === c.id)
  const titles = used.map(item => `"${matchupTitle({ matchup: item, ...entryOf(item) })}"`)
  const warning = titles.length ? ` Os confrontos ${titles.join(", ")} continuam, com esse lado vazio.` : ""
  if (
    !(await confirmAction(`Excluir a comp "${c.name}"? As táticas dela também saem.${warning}`, "Excluir composição"))
  )
    return false
  writeTactic(S, c.id, c.name, "", Date.now(), [])
  S.comps = S.comps.filter(x => x.id !== c.id)
  detachMissingComps(S.matchups, S.comps)
  if (S.tacticsMatchup && !findMatchup(S.comps, S.matchups, S.tacticsMatchup)) S.tacticsMatchup = null
  if (!S.comps.length) S.comps.push(blank())
  if (!compById(S.cur)) {
    S.cur = (S.comps.find(x => x.id === S.lastComp && !isEnemy(x)) || oursOf(S.comps)[0] || S.comps[0]).id
    S.curMatchup = matchupsOfComp(S.matchups, S.cur).find(item => item.ours === S.cur)?.id ?? null
  }
  if (!boardEnemy()) session.side = "us"
  save()
  hooks.renderAll()
  hooks.publishRoute("comps")
  focusMatchup("ours")
  return true
}

// Botão direito no OP.GG troca o link; sem link, o clique esquerdo também pede.
// Na tática de um confronto, o OP.GG é o da adversária dele.
export const opggTarget = () =>
  S.tacticsMatchup ? findMatchup(S.comps, S.matchups, S.tacticsMatchup)?.enemy || cur() : cur()
export async function editOpggLink(target?: Composition) {
  const item = target || cur(),
    value = await askName("Link do OP.GG do time adversário", opggOf(item), "Endereço (deixe vazio para remover)")
  if (value === undefined) return
  const link = normalizeOpggLink(value)
  if (link === null) {
    toast("Link inválido. Cole o endereço completo do OP.GG.")
    return
  }
  setOpgg(item, link)
  touch(item)
  save()
  hooks.renderEditor()
  toast(link ? "Link do OP.GG salvo" : "Link do OP.GG removido")
  ;($("#editor [data-tactic-opgg]") || $("#editor [data-matchup-opgg]"))?.focus({ preventScroll: true })
}
