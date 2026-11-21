// Fluxos de gravação do app contra as regras reais (`firestore.rules`), no emulador local.
// Contas fictícias (ana, bia, caio); só os e-mails de admin vêm da configuração, porque as regras os fixam.
import { readFileSync } from "node:fs"
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore"
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest"
import { ADMINS } from "../src/shared/config/admins"

let env: RulesTestEnvironment

const player = (key: string) => env.authenticatedContext(key, { email: `${key}@weblol.app` }).firestore()
const admin = () => env.authenticatedContext("admin", { email: ADMINS["panda#zada"] }).firestore()
const adminBruno = () => env.authenticatedContext("bruno", { email: ADMINS["brunoltz#ltz"] }).firestore()
const withEmail = (email: string) => env.authenticatedContext("x", { email }).firestore()
const visitor = () => env.unauthenticatedContext().firestore()

/** Time t1 com a ana como capitã, a bia como membro ativo e o caio com pedido pendente. */
async function seed() {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, "times/t1"), { name: "Time Um", captain: "ana_br1" })
    await setDoc(doc(db, "times/t1/dados/oficial"), { version: 1 })
    await setDoc(doc(db, "membros/ana_br1"), { team: "t1", status: "ativo" })
    await setDoc(doc(db, "membros/bia_br1"), { team: "t1", status: "ativo" })
    await setDoc(doc(db, "membros/caio_br1"), { team: "t1", status: "pendente" })
    await setDoc(doc(db, "contas/ana_br1"), { key: "ana_br1" })
    await setDoc(doc(db, "oficial/admin"), { encPub: {} })
    await setDoc(doc(db, "oficial/outro"), { x: 1 })
    await setDoc(doc(db, "times/t2"), { name: "Time Dois", captain: "zeca_br1" })
    await setDoc(doc(db, "membros/zeca_br1"), { team: "t2", status: "ativo" })
    await setDoc(doc(db, "membros/lia_br1"), { team: "t2", status: "ativo" })
  })
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-weblol",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await seed()
})

describe("chave pública e dados do admin", () => {
  it("qualquer um lê a chave pública, mas só o admin grava", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "oficial/admin")))
    await assertFails(setDoc(doc(player("ana_br1"), "oficial/admin"), { x: 1 }))
    await assertSucceeds(setDoc(doc(admin(), "oficial/admin"), { x: 1 }))
  })

  it("os outros documentos oficiais são só do admin", async () => {
    await assertFails(getDoc(doc(player("ana_br1"), "oficial/outro")))
    await assertSucceeds(getDoc(doc(admin(), "oficial/outro")))
  })
})

describe("contas", () => {
  it("saber se a conta existe é público; listar todas é do admin", async () => {
    await assertSucceeds(getDoc(doc(visitor(), "contas/ana_br1")))
    await assertFails(getDocs(collection(player("bia_br1"), "contas")))
    await assertSucceeds(getDocs(collection(admin(), "contas")))
  })

  it("cada jogador cria só a própria conta", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "contas/bia_br1"), { key: "bia_br1" }))
    await assertFails(setDoc(doc(player("bia_br1"), "contas/caio_br1"), { key: "caio_br1" }))
    await assertFails(setDoc(doc(player("bia_br1"), "contas/bia_br1"), { key: "outra" }))
  })

  it("só o dono ou o admin apaga a conta", async () => {
    await assertFails(deleteDoc(doc(player("bia_br1"), "contas/ana_br1")))
    await assertSucceeds(deleteDoc(doc(player("ana_br1"), "contas/ana_br1")))
  })
})

describe("times", () => {
  it("visitante não vê o time; quem entrou vê", async () => {
    await assertFails(getDoc(doc(visitor(), "times/t1")))
    await assertSucceeds(getDoc(doc(player("caio_br1"), "times/t1")))
  })

  it("quem cria o time vira o capitão, e não pode criar com outro capitão", async () => {
    await assertSucceeds(setDoc(doc(player("caio_br1"), "times/t4"), { name: "Quatro", captain: "caio_br1" }))
    await assertFails(setDoc(doc(player("caio_br1"), "times/t3"), { name: "Três", captain: "ana_br1" }))
  })

  it("o capitão edita o time, mas não passa a capitania por aqui", async () => {
    await assertSucceeds(updateDoc(doc(player("ana_br1"), "times/t1"), { name: "Novo nome" }))
    await assertFails(updateDoc(doc(player("ana_br1"), "times/t1"), { captain: "bia_br1" }))
    await assertFails(updateDoc(doc(player("bia_br1"), "times/t1"), { name: "Intruso" }))
  })

  it("só o admin apaga o time", async () => {
    await assertFails(deleteDoc(doc(player("ana_br1"), "times/t1")))
    await assertSucceeds(deleteDoc(doc(admin(), "times/t1")))
  })
})

describe("dados oficiais do time", () => {
  const dados = "times/t1/dados/oficial"

  it("membro ativo lê; pedido pendente e visitante não", async () => {
    await assertSucceeds(getDoc(doc(player("bia_br1"), dados)))
    await assertFails(getDoc(doc(player("caio_br1"), dados)))
    await assertFails(getDoc(doc(visitor(), dados)))
  })

  it("só o capitão (ou o admin) publica", async () => {
    await assertSucceeds(setDoc(doc(player("ana_br1"), dados), { version: 2 }))
    await assertFails(setDoc(doc(player("bia_br1"), dados), { version: 3 }))
    await assertSucceeds(setDoc(doc(admin(), dados), { version: 4 }))
  })
})

describe("prints das táticas", () => {
  const print = (size: number) => ({ data: "x".repeat(size) })

  it("membro ativo cria; quem não é do time não", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/imagens/i1"), print(10)))
    await assertFails(setDoc(doc(player("caio_br1"), "times/t1/imagens/i2"), print(10)))
  })

  it("print grande demais (1 MB ou mais) é recusado", async () => {
    await assertFails(setDoc(doc(player("bia_br1"), "times/t1/imagens/i3"), print(1_000_000)))
  })

  it("só o capitão apaga", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/imagens/i4"), print(10)))
    await assertFails(deleteDoc(doc(player("bia_br1"), "times/t1/imagens/i4")))
    await assertSucceeds(deleteDoc(doc(player("ana_br1"), "times/t1/imagens/i4")))
  })
})

describe("envios para o capitão aprovar", () => {
  it("membro ativo envia em seu nome; em nome de outro não", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/envios/e1"), { from: "bia_br1" }))
    await assertFails(setDoc(doc(player("bia_br1"), "times/t1/envios/e2"), { from: "ana_br1" }))
  })

  it("pedido pendente não envia", async () => {
    await assertFails(setDoc(doc(player("caio_br1"), "times/t1/envios/e3"), { from: "caio_br1" }))
  })

  it("só o capitão lê os envios", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/envios/e4"), { from: "bia_br1" }))
    await assertFails(getDoc(doc(player("bia_br1"), "times/t1/envios/e4")))
    await assertSucceeds(getDoc(doc(player("ana_br1"), "times/t1/envios/e4")))
  })
})

describe("filiação ao time", () => {
  it("o jogador só pede para entrar (pendente), nunca entra direto", async () => {
    await assertSucceeds(setDoc(doc(player("dani_br1"), "membros/dani_br1"), { team: "t1", status: "pendente" }))
    await assertFails(setDoc(doc(player("edu_br1"), "membros/edu_br1"), { team: "t1", status: "ativo" }))
  })

  it("não pede em nome de outro jogador", async () => {
    await assertFails(setDoc(doc(player("dani_br1"), "membros/edu_br1"), { team: "t1", status: "pendente" }))
  })

  it("o capitão aceita o pedido; um membro comum não", async () => {
    await assertSucceeds(updateDoc(doc(player("ana_br1"), "membros/caio_br1"), { status: "ativo" }))
    await assertFails(updateDoc(doc(player("bia_br1"), "membros/caio_br1"), { status: "ativo" }))
  })

  it("o capitão não muda o jogador de time", async () => {
    await assertFails(updateDoc(doc(player("ana_br1"), "membros/bia_br1"), { team: "t2" }))
  })

  it("o jogador lê a própria filiação, não a dos outros fora do time", async () => {
    await assertSucceeds(getDoc(doc(player("caio_br1"), "membros/caio_br1")))
    await assertFails(getDoc(doc(player("dani_br1"), "membros/bia_br1")))
  })

  it("o jogador sai do time; o capitão também remove", async () => {
    await assertSucceeds(deleteDoc(doc(player("bia_br1"), "membros/bia_br1")))
    await assertSucceeds(deleteDoc(doc(player("ana_br1"), "membros/caio_br1")))
  })
})

describe("isolamento entre times", () => {
  it("membro e capitão de outro time não leem nem gravam no t1", async () => {
    await assertFails(getDoc(doc(player("lia_br1"), "times/t1/dados/oficial")))
    await assertFails(setDoc(doc(player("lia_br1"), "times/t1/imagens/i1"), { data: "x" }))
    await assertFails(setDoc(doc(player("lia_br1"), "times/t1/envios/e1"), { from: "lia_br1" }))
    await assertFails(setDoc(doc(player("zeca_br1"), "times/t1/dados/oficial"), { version: 9 }))
    await assertFails(updateDoc(doc(player("zeca_br1"), "times/t1"), { name: "Invasão" }))
    await assertFails(updateDoc(doc(player("zeca_br1"), "membros/caio_br1"), { status: "ativo" }))
    await assertFails(deleteDoc(doc(player("zeca_br1"), "membros/bia_br1")))
  })
})

describe("identidade a partir do e-mail", () => {
  it("só e-mails nome_tag@weblol.app valem como jogador", async () => {
    await assertFails(setDoc(doc(withEmail("ana_br1@gmail.com"), "contas/ana_br1"), { key: "ana_br1" }))
    await assertFails(setDoc(doc(withEmail("ana_br1@weblol.app.evil.com"), "contas/ana_br1"), { key: "ana_br1" }))
    await assertFails(setDoc(doc(withEmail("ANA_BR1@weblol.app"), "contas/ana_br1"), { key: "ana_br1" }))
  })

  it("sessão anônima não lê o time", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("anon").firestore(), "times/t1")))
  })

  it("o e-mail de cada admin vira a chave dele (os dois admins)", async () => {
    await assertSucceeds(setDoc(doc(adminBruno(), "contas/brunoltz_ltz"), { key: "brunoltz_ltz" }))
    await assertSucceeds(setDoc(doc(admin(), "contas/panda_zada"), { key: "panda_zada" }))
    await assertFails(setDoc(doc(adminBruno(), "contas/panda_zada"), { key: "panda_zada" }))
  })
})

describe("admin e coleções só dele", () => {
  it("versoes, envios, usuarios e oficial: admin sim, jogador não", async () => {
    for (const path of ["versoes/v1", "envios/e1", "usuarios/u1", "oficial/outro"]) {
      await assertFails(setDoc(doc(player("ana_br1"), path), { x: 1 }))
      await assertFails(getDoc(doc(player("ana_br1"), path)))
      await assertSucceeds(setDoc(doc(adminBruno(), path), { x: 1 }))
      await assertSucceeds(getDoc(doc(admin(), path)))
    }
  })

  it("o admin gerencia times, membros, prints e envios de qualquer time", async () => {
    await assertSucceeds(updateDoc(doc(admin(), "times/t1"), { captain: "bia_br1" }))
    await assertSucceeds(setDoc(doc(admin(), "membros/novo_br1"), { team: "t1", status: "ativo" }))
    await assertSucceeds(updateDoc(doc(admin(), "membros/caio_br1"), { status: "ativo" }))
    await assertSucceeds(getDoc(doc(admin(), "membros/bia_br1")))
    await assertSucceeds(deleteDoc(doc(admin(), "membros/bia_br1")))
    await assertSucceeds(setDoc(doc(admin(), "times/t1/imagens/i1"), { data: "x" }))
    await assertSucceeds(getDoc(doc(admin(), "times/t1/imagens/i1")))
    await assertSucceeds(deleteDoc(doc(admin(), "times/t1/imagens/i1")))
    await assertSucceeds(setDoc(doc(admin(), "times/t1/envios/e1"), { from: "x" }))
    await assertSucceeds(getDoc(doc(admin(), "times/t1/envios/e1")))
    await assertSucceeds(deleteDoc(doc(admin(), "times/t1/envios/e1")))
  })
})

describe("casos de borda das coleções", () => {
  it("conta: visitante não cria, outro jogador não altera", async () => {
    await assertFails(setDoc(doc(visitor(), "contas/novo_br1"), { key: "novo_br1" }))
    await assertFails(updateDoc(doc(player("bia_br1"), "contas/ana_br1"), { key: "ana_br1" }))
    await assertSucceeds(getDoc(doc(visitor(), "contas/inexistente_br1")))
  })

  it("time: visitante não cria", async () => {
    await assertFails(setDoc(doc(visitor(), "times/t9"), { name: "X", captain: "x_br1" }))
  })

  it("prints: leitura por membro e capitão, sem atualização, só texto, limite exato", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/imagens/i1"), { data: "x" }))
    await assertSucceeds(getDoc(doc(player("bia_br1"), "times/t1/imagens/i1")))
    await assertSucceeds(getDoc(doc(player("ana_br1"), "times/t1/imagens/i1")))
    await assertFails(updateDoc(doc(player("bia_br1"), "times/t1/imagens/i1"), { data: "y" }))
    await assertFails(setDoc(doc(player("bia_br1"), "times/t1/imagens/i2"), { data: 123 }))
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/imagens/i3"), { data: "x".repeat(999_999) }))
  })

  it("envios: o capitão apaga, membro de outro time não lê", async () => {
    await assertSucceeds(setDoc(doc(player("bia_br1"), "times/t1/envios/e1"), { from: "bia_br1" }))
    await assertFails(getDoc(doc(player("lia_br1"), "times/t1/envios/e1")))
    await assertSucceeds(deleteDoc(doc(player("ana_br1"), "times/t1/envios/e1")))
  })

  it("filiação: capitão entra direto como ativo no próprio time; ninguém mais se promove", async () => {
    await assertSucceeds(setDoc(doc(player("fred_br1"), "times/t3"), { name: "Três", captain: "fred_br1" }))
    await assertSucceeds(setDoc(doc(player("fred_br1"), "membros/fred_br1"), { team: "t3", status: "ativo" }))
    await assertFails(setDoc(doc(player("dani_br1"), "membros/dani_br1"), { team: "t1", status: "ativo" }))
  })

  it("filiação: membro lista os colegas, capitão lê um deles, pendente não se promove", async () => {
    await assertSucceeds(getDocs(query(collection(player("bia_br1"), "membros"), where("team", "==", "t1"))))
    await assertSucceeds(getDoc(doc(player("ana_br1"), "membros/bia_br1")))
    await assertFails(updateDoc(doc(player("caio_br1"), "membros/caio_br1"), { status: "ativo" }))
    await assertFails(deleteDoc(doc(player("lia_br1"), "membros/bia_br1")))
  })
})
