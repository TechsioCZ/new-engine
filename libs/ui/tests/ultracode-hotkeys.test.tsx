// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { act, createRef } from "react"
import { createRoot } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { Hotkeys } from "../src/atoms/hotkeys"

function markup(element: Parameters<typeof renderToStaticMarkup>[0]) {
  const container = document.createElement("div")
  container.innerHTML = renderToStaticMarkup(element)
  return container
}

describe("Hotkeys compound spacing", () => {
  it("uses the next spacing step without changing keycap padding or text sizes", () => {
    const tokens = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/components/atoms/_hotkeys.css"
      ),
      "utf8"
    )
    expect(tokens).toContain("--gap-hotkeys: var(--spacing-100);")
    expect(tokens).toContain("--padding-hotkeys-key-x: var(--spacing-100);")
    expect(tokens).toContain("--padding-hotkeys-key-y: var(--spacing-50);")
    expect(tokens).toContain("--text-hotkeys-sm: var(--text-xs);")
    expect(tokens).toContain("--text-hotkeys-md: var(--text-sm);")
    expect(tokens).toContain("--text-hotkeys-lg: var(--text-md);")
  })

  it("keeps full compound labels and separator spacing from flex compression", () => {
    const container = markup(
      <Hotkeys.Root dir="rtl">
        <Hotkeys.Key>Control</Hotkeys.Key>
        <Hotkeys.Separator />
        <Hotkeys.Key>ArrowLeft</Hotkeys.Key>
      </Hotkeys.Root>
    )
    const root = container.firstElementChild
    expect(root?.getAttribute("dir")).toBe("rtl")
    expect(root?.classList.contains("gap-hotkeys")).toBe(true)
    expect(root?.textContent).toBe("Control+ArrowLeft")
    const parts = container.querySelectorAll(
      '[data-part="key"], [data-part="separator"]'
    )
    expect(parts).toHaveLength(3)
    for (const part of parts) {
      expect(part.classList.contains("shrink-0")).toBe(true)
      expect(part.classList.contains("truncate")).toBe(false)
      expect(part.classList.contains("overflow-hidden")).toBe(false)
    }
    expect(
      container
        .querySelector('[data-part="separator"]')
        ?.getAttribute("aria-hidden")
    ).toBe("true")
    expect(container.querySelectorAll("kbd")).toHaveLength(2)
  })

  it("allows callers to override the root gap and each part's shrink behavior", () => {
    const container = markup(
      <Hotkeys className="gap-200">
        <Hotkeys.Key className="shrink">Ctrl</Hotkeys.Key>
        <Hotkeys.Separator className="shrink">then</Hotkeys.Separator>
        <Hotkeys.Key>Enter</Hotkeys.Key>
      </Hotkeys>
    )
    const root = container.firstElementChild
    expect(root?.classList.contains("gap-200")).toBe(true)
    expect(root?.classList.contains("gap-hotkeys")).toBe(false)
    for (const part of [
      container.querySelector("kbd"),
      container.querySelector('[data-part="separator"]'),
    ]) {
      expect(part?.classList.contains("shrink")).toBe(true)
      expect(part?.classList.contains("shrink-0")).toBe(false)
    }
    expect(root?.textContent).toBe("CtrlthenEnter")
  })

  it.each(["sm", "md", "lg"] as const)(
    "retains %s platform formatting and display-only semantics",
    (size) => {
      const container = markup(
        <Hotkeys
          formatOptions={{ platform: "windows" }}
          hotkey="mod+Shift+A"
          size={size}
        />
      )
      expect(container.textContent).toBe("Ctrl Shift A")
      expect(
        container.firstElementChild?.classList.contains(`text-hotkeys-${size}`)
      ).toBe(true)
      expect(
        container.querySelector("kbd")?.classList.contains("shrink-0")
      ).toBe(true)
      expect(container.querySelector("[tabindex]")).toBeNull()
    }
  )

  it("preserves all compound refs and caller keyboard handlers", async () => {
    const container = document.createElement("div")
    document.body.append(container)
    const root = createRoot(container)
    const rootRef = createRef<HTMLSpanElement>()
    const keyRef = createRef<HTMLElement>()
    const separatorRef = createRef<HTMLSpanElement>()
    const onKeyDown = vi.fn()
    try {
      await act(() => {
        root.render(
          <Hotkeys.Root onKeyDown={onKeyDown} ref={rootRef}>
            <Hotkeys.Key ref={keyRef}>Ctrl</Hotkeys.Key>
            <Hotkeys.Separator ref={separatorRef} />
            <Hotkeys.Key>Enter</Hotkeys.Key>
          </Hotkeys.Root>
        )
      })
      expect(rootRef.current).toBe(container.firstElementChild)
      expect(keyRef.current).toBe(container.querySelector("kbd"))
      expect(separatorRef.current).toBe(
        container.querySelector('[data-part="separator"]')
      )
      await act(() => {
        keyRef.current?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
        )
      })
      expect(onKeyDown).toHaveBeenCalledOnce()
    } finally {
      await act(() => root.unmount())
      container.remove()
    }
    expect(rootRef.current).toBeNull()
    expect(keyRef.current).toBeNull()
    expect(separatorRef.current).toBeNull()
  })
})
