// Abas do app principal: endereço (#/rota) ↔ tela, carga dos iframes e links copiáveis.
import type { HostNavigation, FrameHandlers } from "@/shared/host-bridge"
import { $, toast } from "@/shared/lib/dom"
import { renderAdmin } from "../ui/admin"
import { closeModal } from "../ui/login-dialog"
import { askOnCamp } from "../ui/team-step"
import { isCaptain, user } from "./identity"
import { session } from "./session"

const screens = { worlds: "./worlds.html", soloq: "./soloq.html", camp: "./camp.html" } as const
type ScreenFile = keyof typeof screens

export const routeRoots = {
  worlds: "/worlds",
  builds: "/builds",
  comps: "/composicoes",
  camp: "/time",
  admin: "/admin",
} as const
type RouteScreen = keyof typeof routeRoots

const loaded = new Map<string, Promise<string>>()
let isFocusingBuildSource = false

const getFrames = () => [...document.querySelectorAll<HTMLIFrameElement>("#screens iframe")]
const frameWindow = (frame: HTMLIFrameElement) => frame.contentWindow as (Window & FrameHandlers) | null

function readRoute() {
  const [path = "", query] = location.hash.slice(1).split("?", 2)
  const [, root, ...parts] = path.split("/")
  const screen = (Object.keys(routeRoots) as RouteScreen[]).find(name => routeRoots[name] === `/${root}`)
  const params = new URLSearchParams(query)
  const frame =
    screen === "builds"
      ? params.get("fonte") === "worlds"
        ? "worlds"
        : "soloq"
      : screen === "comps"
        ? "worlds"
        : screen
  return {
    screen,
    frame,
    parts: screen === "builds" ? ["builds", ...parts] : screen === "comps" ? ["composicoes", ...parts] : parts,
    params,
  }
}

export function writeRoute(path: string, shouldReplace = false) {
  const hash = `#${path}`
  if (location.hash !== hash) history[shouldReplace ? "replaceState" : "pushState"](null, "", hash)
}

function applyFrameRoute(frame: HTMLIFrameElement) {
  const route = readRoute()
  if (frame.id !== `v-${route.frame}` || route.screen !== session.currentScreen) return
  const apply = frameWindow(frame)?.applyWebLolRoute
  if (!apply) return
  void apply(route.parts, route.params)
  if (route.screen === "builds" && isFocusingBuildSource) {
    frame.contentDocument?.querySelector<HTMLElement>('[data-build-source][aria-pressed="true"]')?.focus()
    if (frame.dataset.ready === "true") isFocusingBuildSource = false
  }
}

/** Reescreve endereços antigos para os atuais (Worlds, Builds, SoloQ). */
function normalizeRoute() {
  const [rawPath = "", query] = location.hash.slice(1).split("?", 2)
  const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`
  const builds = path.match(/^\/(?:(worlds)\/)?(builds|campeoes)(\/[^/]+)?\/?$/)
  const soloq = path.match(/^\/soloq(?:\/builds(\/[^/]+)?)?\/?$/)
  if (path === "/worlds/composicoes" || path === "/worlds/composicoes/") {
    writeRoute(routeRoots.comps + (query ? `?${query}` : ""), true)
  } else if (builds || soloq) {
    const params = new URLSearchParams(query)
    const isSoloq = Boolean(soloq) || (builds?.[2] === "builds" && !builds[1] && params.get("fonte") !== "worlds")
    params.set("fonte", isSoloq ? "soloq" : "worlds")
    if (builds?.[2] === "campeoes" && !params.has("posicao")) params.set("posicao", "top")
    writeRoute(`${routeRoots.builds}${soloq?.[1] || builds?.[3] || ""}?${params}`, true)
  }
}

export function openRoute() {
  normalizeRoute()
  const { screen, frame } = readRoute()
  if (screen !== "builds") isFocusingBuildSource = false
  if (!screen) writeRoute(routeRoots.worlds, true)
  show(screen || "worlds", frame || "worlds")
  for (const each of getFrames()) applyFrameRoute(each)
  // Worlds e SoloQ não pedem usuário nem time
  if (session.currentScreen !== "camp" && session.currentScreen !== "admin" && session.dismissLogin) closeModal()
  askOnCamp()
}

async function copyCurrentLink(onCopy: () => void) {
  const url = new URL(location.href)
  if (!readRoute().screen && session.currentScreen) url.hash = routeRoots[session.currentScreen as RouteScreen]
  try {
    await navigator.clipboard.writeText(url.href)
  } catch {
    prompt("Copie o endereço desta tela", url.href)
    return
  }
  onCopy()
  toast("Link copiado")
}

async function loadScreen(name: string) {
  if (loaded.has(name)) return
  const source = fetch(screens[name as ScreenFile], { cache: "no-cache" }).then(response => {
    if (!response.ok) throw new Error(`Falha ao carregar ${name}`)
    return response.text()
  })
  loaded.set(name, source)
  try {
    $<HTMLIFrameElement>(`#v-${name}`).srcdoc = await source
  } catch {
    loaded.delete(name)
    if (session.currentFrame !== name) return
    isFocusingBuildSource = false
    $("#screen-loading").hidden = true
    const error = $("#screen-error")
    error.textContent = "Não foi possível carregar esta área. Selecione a aba para tentar novamente."
    error.hidden = false
  }
}

function show(screen: string, frame: string) {
  if (screen === "admin" && !user()?.admin && !isCaptain()) screen = frame = "camp"
  session.currentScreen = screen
  session.currentFrame = frame
  document.dispatchEvent(new Event("weblol:close-account"))
  $("#screen-error").hidden = true
  $("#screen-loading").hidden = screen === "admin" || $<HTMLIFrameElement>(`#v-${frame}`).dataset.ready === "true"
  document.body.dataset.currentScreen = screen
  for (const view of document.querySelectorAll(".view")) view.classList.toggle("on", view.id === `v-${frame}`)
  if (screen === "admin") void renderAdmin()
  else void loadScreen(frame)
}

function bindFrame(frame: HTMLIFrameElement) {
  frame.addEventListener("weblol:route-ready", () => applyFrameRoute(frame))
  frame.addEventListener("load", () => {
    if (!frame.hasAttribute("srcdoc")) return
    frame.dataset.ready = "true"
    if (frame.id === `v-${session.currentFrame}`) $("#screen-loading").hidden = true
    applyFrameRoute(frame)
  })
  frame.addEventListener("weblol:navigate", event => {
    const detail = (event as CustomEvent<HostNavigation>).detail
    if (frame.id !== `v-${session.currentFrame}`) return
    if (detail.focusSource) isFocusingBuildSource = true
    writeRoute(detail.path, detail.replace)
    const route = readRoute()
    if (route.screen !== session.currentScreen || route.frame !== session.currentFrame) openRoute()
    if (detail.onCopy) void copyCurrentLink(detail.onCopy)
  })
}

function handleTopClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return
  const link = (event.target as Element).closest<HTMLAnchorElement>("a[data-section]")
  if (!link) return
  event.preventDefault()
  const section = link.dataset.section
  if (section === session.currentScreen && readRoute().screen === session.currentScreen && $("#screen-error").hidden)
    return
  writeRoute(link.hash.slice(1))
  openRoute()
}

/** Liga os iframes, o botão voltar do navegador e o menu do topo; não abre nenhuma tela ainda. */
export function startRouter() {
  for (const frame of getFrames()) bindFrame(frame)
  addEventListener("hashchange", () => openRoute())
  $("#top").addEventListener("click", event => handleTopClick(event as MouseEvent))
  session.reloadCamp = () => {
    const source = loaded.get("camp")
    if (source)
      source.then(
        html => {
          $<HTMLIFrameElement>("#v-camp").srcdoc = html
        },
        () => {},
      )
  }
}
