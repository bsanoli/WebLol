// Ações da aba Administração: aprovar e recusar envios, mexer em jogadores, usuários, admins e backup.
import type { Change } from "@/shared/lib/team-changes"
import { currentFirebase, dbDel, dbSet } from "@/shared/firestore"
import { idbDel } from "@/shared/local-keys"
import { dispId } from "@/shared/lib/account-id"
import { makeSlot, slotRaw } from "@/shared/lib/admin-crypto"
import { $, toast } from "@/shared/lib/dom"
import { confirmAction } from "@/shared/ui/dialog-controls"
import type { AdminData, Submission } from "../model/admin-data"
import { meKey, teamPath } from "../model/identity"
import { setSlot } from "../model/membership"
import { exportBackup } from "../model/migrate"
import { session, type Account } from "../model/session"
import { publish, refreshTeam, type SentChange } from "../model/sync"
import { enterTeam } from "./team-step"

type Region = HTMLElement
type Rerender = () => void

const errorMessage = (error: unknown) => (error as Error).message

/** Liga `handler` a todo botão (ou select) marcado com o atributo `data-*` dado. */
function each<T extends HTMLElement>(region: Region, selector: string, bind: (element: T) => void) {
  for (const element of region.querySelectorAll<T>(selector)) bind(element)
}

const asSent = (submission: Submission, changes: Change[]): SentChange[] =>
  changes.map(change => ({ ...change, sid: submission.id, from: submission.from }))

function pickChanges(submission: Submission, index: number) {
  const approved: SentChange[] = []
  const rejected: SentChange[] = []
  for (const box of document.querySelectorAll<HTMLInputElement>(`[data-s="${index}"]`)) {
    const change = submission.changes[Number(box.dataset.c)]
    if (change) (box.checked ? approved : rejected).push(...asSent(submission, [change]))
  }
  return { approved, rejected }
}

/** Envios pendentes, pedidos, jogadores do time e "publicar minhas alterações". */
export function bindTeamActions(region: Region, data: AdminData, mine: Change[], account: Account, again: Rerender) {
  const submissionAt = (attribute: string, element: HTMLElement) => {
    const submission = data.submissions[Number(element.getAttribute(attribute))]
    return submission && !("isBroken" in submission) ? submission : null
  }
  each<HTMLButtonElement>(region, "[data-ap]", button => {
    button.onclick = async () => {
      const submission = submissionAt("data-ap", button)
      if (!submission) return
      const { approved, rejected } = pickChanges(submission, Number(button.dataset.ap))
      button.disabled = true
      await publish(approved, rejected, `Envio de ${submission.from}`)
      await dbDel(teamPath("envios"), submission.doc).catch(() => {})
      again()
    }
  })
  each<HTMLButtonElement>(region, "[data-rj]", button => {
    button.onclick = async () => {
      const submission = submissionAt("data-rj", button)
      if (!submission || !(await confirmAction(`Recusar todas as alterações de ${submission.from}?`))) return
      button.disabled = true
      await publish([], asSent(submission, submission.changes), `Envio de ${submission.from} recusado`)
      await dbDel(teamPath("envios"), submission.doc).catch(() => {})
      again()
    }
  })
  each<HTMLButtonElement>(region, "[data-delf]", button => {
    button.onclick = async () => {
      const broken = data.submissions[Number(button.dataset.delf)]
      if (broken) await dbDel(teamPath("envios"), broken.doc).catch(() => {})
      again()
    }
  })
  each<HTMLButtonElement>(region, "[data-acc]", button => {
    button.onclick = async () => {
      button.disabled = true
      try {
        await dbSet("membros", button.dataset.acc || "", { status: "ativo", at: Date.now() }, true)
        toast("Jogador aceito no time")
      } catch (error) {
        toast(`Erro: ${errorMessage(error)}`)
      }
      again()
    }
  })
  each<HTMLButtonElement>(region, "[data-den]", button => {
    button.onclick = async () => {
      const id = button.dataset.den || ""
      const member = [...data.requests, ...data.members].find(row => row.id === id)
      if (!(await confirmAction(`Tirar ${member?.riotId || id} do ${session.team?.name}?`))) return
      button.disabled = true
      try {
        await dbDel("membros", id)
      } catch (error) {
        toast(`Erro: ${errorMessage(error)}`)
      }
      again()
    }
  })
  const publishMine = document.querySelector<HTMLButtonElement>("#pubmine")
  if (publishMine)
    publishMine.onclick = () =>
      void publish(
        mine.map(change => ({ ...change, sid: "capitao", from: account.id })),
        [],
        "Alterações do capitão",
      )
}

function bindUserActions(region: Region, data: AdminData, again: Rerender) {
  const userOf = (key: string) => data.users.find(user => user.key === key)
  each<HTMLSelectElement>(region, "[data-team]", select => {
    select.onchange = async () => {
      const key = select.dataset.team || ""
      const user = userOf(key)
      if (!user) return
      select.disabled = true
      try {
        if (select.value)
          await dbSet("membros", key, { team: select.value, status: "ativo", riotId: user.riotId, at: Date.now() })
        else await dbDel("membros", key)
        const team = data.teams.find(row => row.id === select.value)
        toast(team ? `${user.riotId} agora está no ${team.name}` : `${user.riotId} ficou sem time`)
        if (key === meKey()) await enterTeam()
      } catch (error) {
        toast(`Erro: ${errorMessage(error)}`)
      }
      again()
    }
  })
  each<HTMLButtonElement>(region, "[data-delu]", button => {
    button.onclick = async () => {
      const key = button.dataset.delu || ""
      const user = userOf(key)
      if (!user || !(await confirmAction(`Excluir o usuário ${user.riotId}? Ele sai do time e o cadastro é apagado.`)))
        return
      button.disabled = true
      try {
        await dbDel("membros", key).catch(() => {})
        await dbDel("contas", key)
        toast(`${user.riotId} excluído`)
      } catch (error) {
        toast(`Erro: ${errorMessage(error)}`)
      }
      again()
    }
  })
}

const grantErrorText = (error: Error) =>
  error.message === "noslot"
    ? "Seu acesso de admin não foi encontrado"
    : /decrypt|operation/i.test(error.message + error.name)
      ? "Sua senha está incorreta"
      : error.message

function bindAdminGrant(region: Region, account: Account, again: Rerender) {
  let grantId = ""
  each<HTMLButtonElement>(region, "[data-adm]", button => {
    button.onclick = () => {
      grantId = button.dataset.adm || ""
      $("#admwho").textContent = dispId(grantId)
      $("#admform").hidden = false
      $("#admmy").focus()
    }
  })
  $("#admok").onclick = async () => {
    const temporary = $<HTMLInputElement>("#admtmp").value
    if (temporary.length < 6) {
      $("#admerr").textContent = "Use pelo menos 6 caracteres na senha provisória."
      $("#admtmp").focus()
      return
    }
    $<HTMLButtonElement>("#admok").disabled = true
    $("#admerr").textContent = ""
    try {
      if (!session.admin) throw new Error("noslot")
      const raw = await slotRaw(session.admin, account.id, $<HTMLInputElement>("#admmy").value)
      await setSlot(grantId, await makeSlot(raw, temporary, true))
      toast(`${dispId(grantId)} liberado como admin. Passe a senha provisória para ele.`, 6000)
      again()
    } catch (error) {
      $("#admerr").textContent = grantErrorText(error as Error)
      $<HTMLButtonElement>("#admok").disabled = false
    }
  }
  each<HTMLButtonElement>(region, "[data-rmadm]", button => {
    button.onclick = async () => {
      const id = button.dataset.rmadm || ""
      if (!(await confirmAction(`Remover ${dispId(id)} dos admins? Ele não vai mais conseguir entrar como admin.`)))
        return
      try {
        await setSlot(id, null)
        again()
      } catch (error) {
        toast(`Erro: ${errorMessage(error)}`)
      }
    }
  })
}

/** Usuários, admins, backup, bloqueio do admin neste aparelho e "Atualizar". */
export function bindAdminActions(region: Region, data: AdminData, account: Account, again: Rerender) {
  bindUserActions(region, data, again)
  bindAdminGrant(region, account, again)
  $("#exp").onclick = () => void exportBackup()
  $("#lock").onclick = async () => {
    await idbDel("adminKeys")
    session.keys = null
    try {
      const firebase = currentFirebase()
      if (firebase) await firebase.au.signOut(firebase.auth)
    } catch {
      // já estava desconectado
    }
    again()
  }
  $("#refresh").onclick = () => void refreshTeam()
}
