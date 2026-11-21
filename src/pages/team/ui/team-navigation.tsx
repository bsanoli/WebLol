import { LayoutGroup, motion, useReducedMotion } from "motion/react"
import { createRoot } from "react-dom/client"
import { NavigationHover, useNavigationHover } from "@/shared/ui/arc"
import { motionTokens } from "@/shared/ui/arc"
import styles from "@/shared/ui/arc/blocks/site-header/site-header.module.css"

const sections = [
  { value: "comps", label: "Composições", icon: "composition" },
  { value: "map", label: "Mapa tático", icon: "map" },
  { value: "know", label: "Conhecimento", icon: "book" },
  { value: "cap", label: "Gestão do time", icon: "team" },
] as const

type TeamView = (typeof sections)[number]["value"]

function TeamNavigation({
  current,
  showManagement,
  onSelect,
}: {
  current: TeamView
  showManagement: boolean
  onSelect: (view: TeamView) => void
}) {
  const hover = useNavigationHover("[data-nav-item]")
  const reduced = useReducedMotion()

  return (
    <LayoutGroup id="team-navigation">
      <nav
        className="team-navigation"
        aria-label="Ferramentas do time"
        onPointerOver={hover.onPointerOver}
        onPointerLeave={hover.clear}
        onKeyDown={event => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
          const buttons = Array.from(event.currentTarget.querySelectorAll("button"))
          const index = buttons.indexOf(event.target as HTMLButtonElement)
          if (index < 0) return
          event.preventDefault()
          const direction = event.key === "ArrowRight" ? 1 : -1
          buttons[(index + direction + buttons.length) % buttons.length].focus()
        }}
      >
        <NavigationHover target={hover.target?.isConnected ? hover.target : null} />
        {sections.map(({ value, label, icon }) => {
          if (value === "cap" && !showManagement) return null
          const active = current === value
          return (
            <button
              key={value}
              type="button"
              data-nav-item=""
              data-current={active ? "" : undefined}
              aria-pressed={active}
              className={`${styles.navItem} ${styles.accentItem}`}
              onClick={() => onSelect(value)}
            >
              {active && (
                <motion.span
                  className={styles.indicator}
                  layoutId="current"
                  transition={reduced ? { duration: 0 } : motionTokens.spring.morph}
                  aria-hidden="true"
                />
              )}
              <svg className="icon" aria-hidden="true" focusable="false">
                <use href={`assets/icons.svg#${icon}`} />
              </svg>
              {label}
            </button>
          )
        })}
      </nav>
    </LayoutGroup>
  )
}

export function mountTeamNavigation(host: HTMLElement, onSelect: (view: TeamView) => void) {
  const root = createRoot(host)
  return (current: TeamView, showManagement: boolean) => {
    root.render(<TeamNavigation current={current} showManagement={showManagement} onSelect={onSelect} />)
  }
}
