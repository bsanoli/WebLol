import { SiteHeader } from "@/components/arc/blocks/site-header/site-header"
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { AccountAvatar } from "@/components/account-avatar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ThemePicker } from "@/components/theme-picker"
import { confirmAction, showDialog } from "@/components/ui/dialog-controls"
import "./index.css"
import { connectAnalytics } from "./analytics-bridge"
import { iconMarkup } from "./client/icon"
import { initializeTheme } from "./client/theme"
import { UI_VERSIONS } from "./data/ui-versions"

const sections = [
  { value: "worlds", label: "Worlds", href: "#/worlds" },
  { value: "builds", label: "Builds", href: "#/builds?fonte=worlds" },
  { value: "comps", label: "Composições", href: "#/composicoes" },
  { value: "camp", label: "Área do time", href: "#/time" },
  { value: "admin", label: "Administração", href: "#/admin" },
]
const publicSections = sections.filter(({ value }) => value !== "admin")

const initialPalette = initializeTheme()

type IconName = "reset" | "exit"

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" aria-hidden="true" focusable="false" data-icon="inline-start">
      <use href={`assets/icons.svg#${name}`} />
    </svg>
  )
}

function App() {
  const [current, setCurrent] = useState("worlds")
  const [isAdmin, setIsAdmin] = useState(false)
  const [user, setUser] = useState("")
  const [role, setRole] = useState("")
  const [accountOpen, setAccountOpen] = useState(false)

  useEffect(() => {
    const close = () => setAccountOpen(false)
    document.addEventListener("weblol:close-account", close)
    return () => document.removeEventListener("weblol:close-account", close)
  }, [])

  useEffect(() => {
    function updateNavigation() {
      setCurrent(document.body.dataset.currentScreen ?? "worlds")
      setIsAdmin(document.body.classList.contains("isadmin"))
      setUser(document.body.dataset.accountName ?? "")
      setRole(document.body.dataset.accountRole ?? "")
    }
    const observer = new MutationObserver(updateNavigation)
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "data-current-screen", "data-account-name", "data-account-role"] })
    updateNavigation()
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <a className="skip-link" href="#screens" onClick={event => {
        event.preventDefault()
        document.getElementById("screens")?.focus()
      }}>Ir para o conteúdo</a>
      <SiteHeader
        id="top"
        variant="simple"
        sticky={false}
        label="Áreas do painel"
        brand={{
          name: "WebLol, página inicial",
          href: "#/worlds",
          mark: <img src="./assets/brand/weblol-logo-horizontal-transparent.png" alt="" width="1200" height="185" className="h-auto w-[120px]" />,
        }}
        items={isAdmin ? sections : publicSections}
        current={current}
        primaryAction={null}
        secondaryAction={null}
        toolbar={
          <div className="header-actions">
            {!user && <Button variant="default" className="signup-trigger" title="Criar conta ou entrar com seu Riot ID"
              onClick={() => (window as unknown as { startSignup?: () => void }).startSignup?.()}>Cadastrar</Button>}
            <ThemePicker initialPalette={initialPalette} />
            <Popover open={accountOpen} onOpenChange={setAccountOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="account-trigger"
                  aria-label={user ? `Conta de ${user}` : "Conta"} title={user || "Conta"}>
                  <AccountAvatar user={user} />
                  {user && <span className="account-name">{user}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent forceMount id="header-tools" className="toolbar" align="end" aria-label="Conta e sincronização"
                hidden={!accountOpen} onCloseAutoFocus={event => {
                  if (document.querySelector(".shell-login-dialog")) event.preventDefault()
                }}>
                {user && <div className="account-details">
                  <strong>{user}</strong>
                  {role && <small>{role}</small>}
                </div>}
                <Button id="sync" variant="outline">
                  <Icon name="reset" />
                  <span id="sync-label" aria-live="polite">Verificando sincronização…</span>
                </Button>
                <Button id="send" hidden />
                <Button id="logout" variant="ghost" title="Sair ou trocar usuário">
                  <Icon name="exit" /> Sair
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        }
      />
      <main id="screens" tabIndex={-1} aria-label="Painel WebLol">
        <iframe id="v-worlds" className="view" title="Estatísticas do Worlds" />
        <iframe id="v-soloq" className="view" title="Builds de SoloQ dos pros" />
        <iframe id="v-camp" className="view" title="Área do time" />
        <section id="v-admin" className="view" aria-label="Administração">
          <div className="wrap">
            <Card>
              <CardHeader>
                <CardTitle><h1 className="font-display text-[length:var(--wl-title-size)] font-bold">Administração</h1></CardTitle>
                <CardDescription>Revise as alterações enviadas e publique a versão oficial do time.</CardDescription>
              </CardHeader>
              <CardContent id="admin" />
            </Card>
          </div>
        </section>
        <div id="screen-loading" role="status" hidden className="screen-message">Carregando esta área…</div>
        <div id="screen-error" role="status" hidden className="screen-message" />
      </main>
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

connectAnalytics(document.getElementById("v-worlds") as HTMLIFrameElement)

async function start() {
  try {
    // The classic shell still looks up this helper by its global name.
    Object.assign(window, { iconMarkup, UI_VERSIONS, confirmAction, showDialog })
    await loadClassicScript("./assets/sync.js")
    await loadClassicScript("./assets/shell.js")
  } catch {
    const error = document.getElementById("screen-error")!
    error.textContent = "Não foi possível iniciar o painel. Recarregue a página para tentar novamente."
    error.hidden = false
  }
}
void start()
