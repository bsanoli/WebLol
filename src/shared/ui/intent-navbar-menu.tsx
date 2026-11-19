import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react"
import { Button } from "react-aria-components/Button"
import { Menu, MenuItem, MenuTrigger } from "react-aria-components/Menu"
import { Popover } from "react-aria-components/Popover"
import styles from "./intent-navbar-menu.module.css"

type NavigationLink = { label: string; href?: string; current?: boolean }

// Intent UI navbar-01 uses MenuTrigger, NavbarItem and Menu for its category dropdown.
// WebLol supplies the trigger appearance and the hover opening mode.
export function IntentNavbarMenu({ links, children, ...trigger }: {
  links: NavigationLink[]
  children: ReactNode
  className: string
  "data-nav-item": string
  "data-section": string
  "data-current"?: string
}) {
  const [mode, setMode] = useState<"hover" | "press" | null>(null)
  const isOpen = mode !== null
  const timers = useRef<{ open?: number; close?: number }>({})
  const button = useRef<HTMLButtonElement>(null)

  const stopTimers = useCallback(() => {
    window.clearTimeout(timers.current.open)
    window.clearTimeout(timers.current.close)
  }, [])
  useEffect(() => stopTimers, [stopTimers])

  useEffect(() => {
    const owner = button.current?.ownerDocument
    if (!owner || !isOpen) return
    const controller = new AbortController()
    const { signal } = controller

    function closeFromFrame() {
      stopTimers()
      setMode(null)
    }

    // Clicks inside an iframe do not reach React Aria's outside listener in the header document.
    function listenInFrame(frame: HTMLIFrameElement) {
      frame.contentDocument?.addEventListener("pointerdown", closeFromFrame, { capture: true, signal })
    }

    owner.querySelectorAll("iframe").forEach(listenInFrame)
    owner.addEventListener("load", event => {
      if (event.target instanceof HTMLIFrameElement) listenInFrame(event.target)
    }, { capture: true, signal })
    return () => controller.abort()
  }, [isOpen, stopTimers])

  function enter(event: PointerEvent) {
    if (event.pointerType !== "mouse") return
    stopTimers()
    if (!mode) timers.current.open = window.setTimeout(() => setMode("hover"), 120)
  }
  function leave(event: PointerEvent) {
    if (event.pointerType !== "mouse") return
    stopTimers()
    if (mode === "hover") {
      timers.current.close = window.setTimeout(() => {
        if (!document.activeElement?.closest("[data-intent-navbar-menu]")) setMode(null)
      }, 220)
    }
  }
  function toggle(open: boolean) {
    stopTimers()
    setMode(open ? "press" : null)
  }

  return (
    <MenuTrigger isOpen={isOpen} onOpenChange={toggle}>
      <Button {...trigger} ref={button} data-open={mode ? "" : undefined}
        onPointerEnter={enter} onPointerLeave={leave}
        onKeyDown={event => {
          if (mode !== "hover" || (event.key !== "ArrowDown" && event.key !== "Enter" && event.key !== " ")) return
          event.preventDefault()
          stopTimers()
          setMode("press")
          requestAnimationFrame(() => {
            const menuId = button.current?.getAttribute("aria-controls")
            if (menuId) document.getElementById(menuId)?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
          })
        }}>
        {children}
      </Button>
      <Popover placement="bottom start" offset={8} isNonModal={mode === "hover"} className={styles.popover}
        data-intent-navbar-menu="" onPointerEnter={stopTimers} onPointerLeave={leave}>
        <Menu className={styles.menu} autoFocus={mode === "hover" ? false : undefined} items={links}>
          {link => <MenuItem id={link.href ?? link.label} href={link.href} textValue={link.label} className={styles.item}
            render={link.current ? props => "href" in props ? <a {...props} aria-current="page" /> : <div {...props} /> : undefined}>
            {link.label}
          </MenuItem>}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
