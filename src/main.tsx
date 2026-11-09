import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import "./index.css"

const sections = [
  { id: "worlds", label: "Worlds", icon: "worlds" },
  { id: "camp", label: "Área do time", icon: "team" },
  { id: "admin", label: "Administração", icon: "admin" },
] as const

type IconName = (typeof sections)[number]["icon"] | "flag" | "link" | "reset" | "exit"

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" aria-hidden="true" focusable="false" data-icon="inline-start">
      <use href={`assets/icons.svg#${name}`} />
    </svg>
  )
}

function App() {
  return (
    <>
      <header id="top">
        <div className="flex items-center gap-2 font-bold text-primary">
          <Icon name="flag" /> WebLol
        </div>
        <nav aria-label="Áreas do painel" className="flex flex-wrap gap-1">
          {sections.map(({ id, label, icon }) => (
            <Button key={id} variant="ghost" className="tab" data-t={id}>
              <Icon name={icon} /> {label}
            </Button>
          ))}
        </nav>
        <div className="toolbar flex flex-wrap items-center gap-2" aria-label="Conta e sincronização">
          <Button id="copy-link" variant="outline" hidden>
            <Icon name="link" /> Copiar link
          </Button>
          <Button id="sync" variant="outline" className="chip">
            <Icon name="reset" />
            <span id="sync-label" aria-live="polite">Verificando sincronização…</span>
          </Button>
          <Button id="send" hidden />
          <Badge id="user" variant="secondary" />
          <Button id="logout" variant="ghost" title="Sair ou trocar usuário">
            <Icon name="exit" /> Sair
          </Button>
        </div>
      </header>
      <main id="screens" aria-label="Painel WebLol">
        <iframe id="v-worlds" className="view" title="Estatísticas do Worlds" />
        <iframe id="v-camp" className="view" title="Área do time" />
        <section id="v-admin" className="view" aria-label="Administração">
          <div className="wrap">
            <Card>
              <CardHeader>
                <CardTitle><h1 className="text-2xl font-bold">Administração</h1></CardTitle>
                <CardDescription>Revise as alterações enviadas e publique a versão oficial do time.</CardDescription>
              </CardHeader>
              <CardContent id="admin" />
            </Card>
          </div>
        </section>
        <div id="screen-error" role="status" hidden className="p-4" />
      </main>
      <dialog id="modal" aria-labelledby="modal-title"><div id="mbox" /></dialog>
      <div className="toast" id="toast" role="status" />
    </>
  )
}

function loadClassicScript(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = path
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(path))
    document.body.append(script)
  })
}

const root = createRoot(document.getElementById("app")!)
flushSync(() => root.render(<App />))

async function start() {
  try {
    await loadClassicScript("./assets/icon.js")
    await loadClassicScript("./assets/sync.js")
    await loadClassicScript("./assets/shell.js")
  } catch {
    const error = document.getElementById("screen-error")!
    error.textContent = "Não foi possível iniciar o painel. Recarregue a página para tentar novamente."
    error.hidden = false
  }
}
void start()
