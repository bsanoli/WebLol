import { SiteHeader } from "@/shared/ui/arc"
import { useEffect, useState } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { Button } from "@/shared/ui/button"
import { AccountAvatar } from "@/entities/account"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { ThemePicker } from "@/features/select-theme"
import "../styles/index.css"
import { connectAnalytics } from "./analytics-bridge"
import { initializeTheme } from "@/shared/config"
import { UI_VERSIONS } from "../config/ui-versions"
import { exposeHostGlobals, session, startPanel, startSignup } from "@/features/auth"

const sections = [
  { value: "worlds", label: "Worlds", href: "#/worlds" },
  { value: "builds", label: "Builds", href: "#/builds?fonte=soloq" },
  { value: "camp", label: "Área do time", href: "#/time" },
  { value: "admin", label: "Administração", href: "#/admin" },
]
const publicSections = sections.filter(({ value }) => value !== "admin")
const worldsLinks = [
  { value: "worlds", label: "Visão geral", href: "#/worlds" },
  { value: "comps", label: "Composições do Worlds", href: "#/composicoes" },
]
const teamLinks = [
  { label: "Composições", href: "#/time/composicoes" },
  { label: "Mapa tático", href: "#/time/mapa" },
  { label: "Conhecimento", href: "#/time/conhecimento" },
]

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
  const [canViewManagement, setCanViewManagement] = useState(false)
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
      setCanViewManagement(document.body.dataset.teamManagement === "true")
      setUser(document.body.dataset.accountName ?? "")
      setRole(document.body.dataset.accountRole ?? "")
    }
    const observer = new MutationObserver(updateNavigation)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [
        "class",
        "data-current-screen",
        "data-account-name",
        "data-account-role",
        "data-team-management",
      ],
    })
    updateNavigation()
    return () => observer.disconnect()
  }, [])

  const navigationItems = (isAdmin ? sections : publicSections).map(section => {
    if (section.value === "worlds")
      return {
        ...section,
        links: worldsLinks.map(link => ({ ...link, current: link.value === current })),
      }
    if (section.value === "camp")
      return {
        ...section,
        links: canViewManagement ? [...teamLinks, { label: "Gestão do time", href: "#/time/gestao" }] : teamLinks,
      }
    return section
  })

  return (
    <>
      <a
        className="skip-link"
        href="#screens"
        onClick={event => {
          event.preventDefault()
          document.getElementById("screens")?.focus()
        }}
      >
        Ir para o conteúdo
      </a>
      <SiteHeader
        id="top"
        variant="simple"
        sticky={false}
        label="Áreas do painel"
        brand={{
          name: "WebLol, página inicial",
          href: "#/worlds",
          mark: (
            <img
              src="./assets/brand/weblol-logo-horizontal-transparent.png"
              alt=""
              width="1200"
              height="185"
              className="h-auto w-[120px]"
            />
          ),
        }}
        items={navigationItems}
        current={current === "comps" ? "worlds" : current}
        primaryAction={null}
        secondaryAction={null}
        toolbar={
          <div className="header-actions">
            {!user && (
              <Button
                variant="default"
                className="signup-trigger"
                title="Criar conta ou entrar com seu Riot ID"
                onClick={() => startSignup()}
              >
                Entrar ou criar conta
              </Button>
            )}
            <ThemePicker initialPalette={initialPalette} />
            <Popover open={accountOpen} onOpenChange={setAccountOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size={user ? "default" : "icon"}
                  className="account-trigger"
                  aria-label={user ? `Conta de ${user}` : "Conta"}
                  title={user || "Conta"}
                >
                  <AccountAvatar user={user} />
                  {user && <span className="account-name">{user}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                forceMount
                id="header-tools"
                className="toolbar"
                align="end"
                sideOffset={12}
                aria-label="Conta e sincronização"
                hidden={!accountOpen}
                onCloseAutoFocus={event => {
                  if (document.querySelector(".shell-login-dialog")) event.preventDefault()
                }}
              >
                {user && (
                  <div className="account-details">
                    <strong>{user}</strong>
                    {role && <small>{role}</small>}
                  </div>
                )}
                <Button id="sync" variant="outline">
                  <Icon name="reset" />
                  <span id="sync-label" aria-live="polite">
                    Verificando sincronização…
                  </span>
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
        <iframe id="v-camp" className="view" title="Área do time" allowFullScreen />
        <section id="v-admin" className="view" aria-label="Administração">
          <div className="wrap">
            <Card>
              <CardHeader>
                <CardTitle>
                  <h1 className="font-display text-[length:var(--wl-title-size)] font-bold">Administração</h1>
                </CardTitle>
                <CardDescription>Revise os envios e publique a versão oficial do time.</CardDescription>
              </CardHeader>
              <CardContent id="admin" />
            </Card>
          </div>
        </section>
        <div id="screen-loading" role="status" hidden className="screen-message">
          Carregando esta área…
        </div>
        <div id="screen-error" role="status" hidden className="screen-message" />
      </main>
      <div className="toast" id="toast" role="status" />
    </>
  )
}

const root = createRoot(document.getElementById("app")!)
flushSync(() => root.render(<App />))

connectAnalytics(document.getElementById("v-worlds") as HTMLIFrameElement)

async function start() {
  try {
    session.uiVersions = UI_VERSIONS
    exposeHostGlobals()
    await startPanel()
  } catch {
    const error = document.getElementById("screen-error")!
    error.textContent = "Não foi possível iniciar o painel. Recarregue a página para tentar novamente."
    error.hidden = false
  }
}
void start()
