import { useLayoutEffect, useRef, type ReactNode } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog"

export function ExistingContent({ element }: { element: HTMLElement }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    host.current?.append(element)
    return () => element.remove()
  }, [element])
  return <div ref={host} />
}

export function showDialog({
  title, children, className, id, initialFocus, onClose, dismissible = true,
}: {
  title: string
  children: HTMLElement
  className?: string
  id?: string
  initialFocus?: () => HTMLElement | null
  onClose?: () => void
  dismissible?: boolean
}) {
  const trigger = document.activeElement
  const host = document.createElement("div")
  document.body.append(host)
  const root = createRoot(host)
  let closed = false
  function close() {
    if (closed) return
    closed = true
    root.unmount()
    host.remove()
    if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
    onClose?.()
  }
  flushSync(() => root.render(<Dialog open onOpenChange={open => { if (!open) close() }}>
    <DialogContent className={className} aria-describedby={undefined} showCloseButton={false}
      onEscapeKeyDown={event => { if (!dismissible) event.preventDefault() }}
      onInteractOutside={event => { if (!dismissible) event.preventDefault() }}
      onOpenAutoFocus={event => {
        const field = initialFocus?.()
        if (!field) return
        event.preventDefault()
        field.focus()
      }}
      onCloseAutoFocus={event => event.preventDefault()}>
      <DialogTitle className="sr-only">{title}</DialogTitle>
      <div id={id}><ExistingContent element={children} /></div>
    </DialogContent>
  </Dialog>))
  return close
}

type Choice<T extends string> = { value: T; label: string; destructive?: boolean }

export function askChoice<T extends string>(title: string, description: ReactNode, choices: Choice<T>[]) {
  const trigger = document.activeElement
  return new Promise<T | undefined>(resolve => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    let finished = false
    function finish(value?: T) {
      if (finished) return
      finished = true
      queueMicrotask(() => {
        root.unmount()
        host.remove()
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
        resolve(value)
      })
    }
    root.render(<AlertDialog open onOpenChange={open => { if (!open) finish() }}>
      <AlertDialogContent className="wl-panel" onCloseAutoFocus={event => event.preventDefault()}>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          {choices.map(({ label, value, destructive }) =>
            <Button key={value} variant={destructive ? "destructive" : "default"}
              onClick={() => finish(value)}>{label}</Button>)}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>)
  })
}

export async function confirmAction(message: string, label = "Confirmar") {
  return (await askChoice(label, message, [{ value: "confirm", label, destructive: true }])) === "confirm"
}

export function askName(title: string, initial: string) {
  const trigger = document.activeElement
  return new Promise<string | undefined>(resolve => {
    const host = document.createElement("div")
    document.body.append(host)
    const root = createRoot(host)
    let finished = false
    function finish(value?: string) {
      if (finished) return
      finished = true
      queueMicrotask(() => {
        root.unmount()
        host.remove()
        if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true })
        resolve(value)
      })
    }
    root.render(<Dialog open onOpenChange={open => { if (!open) finish() }}>
      <DialogContent className="wl-panel" aria-describedby={undefined} showCloseButton={false}
        onCloseAutoFocus={event => event.preventDefault()}>
        <DialogTitle>{title}</DialogTitle>
        <form className="grid gap-4" onSubmit={event => {
          event.preventDefault()
          finish(String(new FormData(event.currentTarget).get("name")).trim())
        }}>
          <label className="grid gap-2" data-slot="field">Nome da jogada
            <Input name="name" defaultValue={initial} onFocus={event => event.currentTarget.select()} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => finish()}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>)
  })
}
