// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { act, type ReactElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it } from "vitest"
import { Hotkeys } from "../src/atoms/hotkeys"
import meta, {
  FocusedSequence,
  Lifecycle,
  NativeConflictPolicy,
} from "../stories/atoms/hotkeys.stories"

let root: Root | undefined

async function mount(element: ReactElement) {
  const container = document.createElement("div")
  document.body.append(container)
  root = createRoot(container)
  await act(async () => root?.render(element))
  return container
}

function storyElement(story: { render?: (...args: never[]) => unknown }) {
  if (!story.render) {
    throw new Error("Missing Hotkeys story render")
  }
  return story.render({} as never, {} as never) as ReactElement
}

afterEach(async () => {
  await act(async () => root?.unmount())
  root = undefined
  document.body.replaceChildren()
})

describe("Hotkeys clarity", () => {
  it("labels the conflict target visibly without changing its accessible name", async () => {
    const container = await mount(storyElement(NativeConflictPolicy))
    const button = container.querySelector("button")
    expect(button?.getAttribute("aria-label")).toBe("Conflict target")
    const label = button?.cloneNode(true) as HTMLElement
    label.querySelector('[data-scope="hotkeys"]')?.remove()
    expect(label.textContent?.trim()).toBe("Conflict target")
    expect(
      button
        ?.querySelector('[data-scope="hotkeys"][data-part="root"]')
        ?.getAttribute("aria-hidden")
    ).toBe("true")
    expect(container.textContent).toContain("second action replaces the first")
    await act(async () => button?.click())
    expect(
      container.querySelector('[data-testid="hotkeys-conflict-result"]')
        ?.textContent
    ).toBe("second")
    expect(
      container.querySelector('[data-testid="hotkeys-registry-size"]')
        ?.textContent
    ).toBe("1")
  })

  it("keeps one replacement binding on the same focused native target", async () => {
    const container = await mount(storyElement(NativeConflictPolicy))
    const button = container.querySelector("button")
    button?.focus()
    expect(document.activeElement).toBe(button)
    await act(() => {
      button?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          code: "KeyK",
          ctrlKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
      button?.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: "k",
          code: "KeyK",
          ctrlKey: true,
          bubbles: true,
        })
      )
    })
    expect(
      container.querySelector('[data-testid="hotkeys-conflict-result"]')
        ?.textContent
    ).toBe("second")
    expect(document.activeElement).toBe(button)
  })

  it("loosens lifecycle controls without changing StrictMode registrations", async () => {
    const container = await mount(storyElement(Lifecycle))
    const row = container.querySelector(".flex-wrap")
    expect(row?.classList.contains("gap-150")).toBe(true)
    expect(row?.querySelectorAll("button")).toHaveLength(7)
    expect(
      container.querySelector('[data-testid="hotkeys-registry-size"]')
        ?.textContent
    ).toBe("3")
    expect(
      container.querySelector('[data-testid="hotkeys-owner-setups"]')
        ?.textContent
    ).toBe("2")
    await act(async () => container.querySelector("button")?.click())
    expect(
      container.querySelector('[data-testid="hotkeys-registry-size"]')
        ?.textContent
    ).toBe("1")
    await act(async () => container.querySelector("button")?.click())
    expect(
      container.querySelector('[data-testid="hotkeys-registry-size"]')
        ?.textContent
    ).toBe("3")
  })

  it("puts real padding inside the captured story root without clipping", () => {
    const decorator = meta.decorators[0]
    if (!decorator) {
      throw new Error("Missing Hotkeys story decorator")
    }
    const html = renderToStaticMarkup(decorator(() => <p>Story content</p>))
    const container = document.createElement("div")
    container.innerHTML = html
    expect(container.firstElementChild?.className).toBe("p-150")
    expect(container.firstElementChild?.firstElementChild?.className).toBe(
      "mx-auto w-full max-w-md"
    )
    expect(html).not.toContain("overflow-hidden")
    expect(html).not.toContain("max-h-")
  })

  it("retains the keyboard-focusable sequence region and its visible focus utility", () => {
    const container = document.createElement("div")
    container.innerHTML = renderToStaticMarkup(storyElement(FocusedSequence))
    const target = container.querySelector('[role="region"]')
    expect(target?.getAttribute("tabindex")).toBe("0")
    expect(
      target?.classList.contains("focus-visible:hotkeys-target-focus")
    ).toBe(true)
  })

  it.each(["sm", "md", "lg"] as const)(
    "preserves %s display-only platform formatting and keycap semantics",
    (size) => {
      const html = renderToStaticMarkup(
        <Hotkeys
          formatOptions={{ platform: "mac" }}
          hotkey="mod+K"
          size={size}
        />
      )
      const container = document.createElement("div")
      container.innerHTML = html
      expect(container.textContent).toBe("⌘ K")
      expect(container.querySelector("kbd")).not.toBeNull()
      expect(
        container.firstElementChild?.classList.contains(`text-hotkeys-${size}`)
      ).toBe(true)
      expect(html).not.toContain("tabindex")
    }
  )

  it("raises only the Business small caption while retaining the shared scale", () => {
    const tokens = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/components/atoms/_hotkeys.css"
      ),
      "utf8"
    )
    const business = readFileSync(
      resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../src/tokens/_business.css"
      ),
      "utf8"
    )
    expect(tokens).toContain("--text-hotkeys-sm: var(--text-xs);")
    expect(business).toContain(
      "--text-hotkeys-sm: calc((var(--text-xs) + var(--text-sm)) / 2);"
    )
    expect(tokens).toContain("--text-hotkeys-md: var(--text-sm);")
    expect(tokens).toContain("--text-hotkeys-lg: var(--text-md);")
    expect(tokens).toContain("outline-width: var(--default-ring-width);")
    expect(tokens).not.toContain("outline: none")
  })
})
