import { type ReactNode, StrictMode, useEffect, useRef, useState } from "react"
import { createRoot, hydrateRoot } from "react-dom/client"
import { renderToString } from "react-dom/server"
import { Hotkeys } from "../../src/atoms/hotkeys"

export function HotkeysHydrationFixture() {
  const container = useRef<HTMLDivElement>(null)
  const [serverLabel, setServerLabel] = useState("")
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    const target = container.current
    if (!target) {
      return
    }
    target.innerHTML = renderToString(<Hotkeys hotkey="mod+K" />)
    setServerLabel(target.textContent ?? "")
    const root = hydrateRoot(target, <Hotkeys hotkey="mod+K" />, {
      onRecoverableError: (error) =>
        setErrors((previous) => [...previous, String(error)]),
    })
    return () => root.unmount()
  }, [])

  return (
    <div className="flex flex-col gap-200">
      <output data-testid="hotkeys-server-label">{serverLabel}</output>
      <div data-testid="hotkeys-hydrated-label" ref={container} />
      <output data-testid="hotkeys-hydration-errors">{errors.join(",")}</output>
    </div>
  )
}

export function HotkeysStrictModeFixture({
  children,
}: {
  children: ReactNode
}) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = container.current
    if (!target) {
      return
    }
    const root = createRoot(target)
    root.render(<StrictMode>{children}</StrictMode>)
    return () => root.unmount()
  }, [children])

  return (
    <div
      data-react-mode={process.env.NODE_ENV}
      data-testid="hotkeys-strict-mode-host"
      ref={container}
    />
  )
}
