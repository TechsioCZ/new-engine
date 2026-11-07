// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { normalizeProps, useMachine } from "@zag-js/react"
import { group, type Options } from "@zag-js/toast"
import postcss from "postcss"
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createToaster, Toast } from "../src/molecules/toast"

type ToastType = NonNullable<Options<string>["type"]>

const title =
  "Your project export for the autumn catalogue and all associated product attachments is ready to download"
const description =
  "Reference: ProjectExport_AutumnCatalogue_ProductAttachments_2026_Complete."
const css = postcss.parse(
  readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../src/tokens/components/molecules/_toast.css"
    ),
    "utf8"
  )
)

type ToastStore = ReturnType<typeof createToaster>
const fixtures: { root: Root; canvas: HTMLDivElement; store: ToastStore }[] = []

afterEach(async () => {
  await act(() => {
    for (const { root, canvas, store } of fixtures.splice(0)) {
      root.unmount()
      store.remove()
      canvas.remove()
    }
  })
  vi.unstubAllGlobals()
})

function ToastFixture({ store }: { store: ToastStore }) {
  const parent = useMachine(group.machine, {
    id: "toast-visual-group",
    store,
  })
  const api = group.connect(parent, normalizeProps)
  return (
    <div {...api.getGroupProps()}>
      {api.getToasts().map((actor, index) => (
        <Toast actor={actor} index={index} key={actor.id} parent={parent} />
      ))}
    </div>
  )
}

async function renderToast(type: ToastType, closable = true) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  const canvas = document.createElement("div")
  document.body.append(canvas)
  const root = createRoot(canvas)
  const store = createToaster()
  fixtures.push({ root, canvas, store })
  await act(() => root.render(<ToastFixture store={store} />))
  // Create the notification only after the real group service has started.
  await act(() => {
    store.create({
      id: "toast-visual-notification",
      title,
      description,
      type,
      closable,
      duration: Number.POSITIVE_INFINITY,
      action: {
        label: "Download complete project export",
        onClick: vi.fn(),
      },
    })
  })
  return canvas
}

// Mounted DOM/token contracts; native geometry and pointer checks remain separate.
describe("Toast visual hierarchy and first-line alignment", () => {
  it.each(["info", "success", "warning", "error", "loading"] as const)(
    "keeps complete %s copy in a flexible title and quieter full-width description",
    async (type) => {
      const canvas = await renderToast(type)
      const heading = canvas.querySelector('[data-part="title"]')
      const body = canvas.querySelector('[data-part="description"]')
      expect(heading?.textContent).toBe(title)
      expect(heading?.classList.contains("flex-1")).toBe(true)
      expect(heading?.classList.contains("min-w-0")).toBe(true)
      expect(heading?.classList.contains("text-toast-fg-readable")).toBe(true)
      expect(body?.textContent).toBe(description)
      expect(body?.classList.contains("text-toast-fg-description")).toBe(true)
      expect(body?.classList.contains("break-words")).toBe(true)
      expect(body?.parentElement).toBe(
        canvas.querySelector('[data-part="root"]')
      )
      expect(
        canvas.querySelector('[data-part="action-trigger"]')?.textContent
      ).toBe("Download complete project export")
    }
  )

  it("centres the unchanged close target on the same first line as the status icon", async () => {
    const canvas = await renderToast("info")
    const close = canvas.querySelector('[data-part="close-trigger"]')
    const frame = close?.parentElement
    const iconFrame = canvas.querySelector('[aria-hidden="true"]')
    expect(close?.getAttribute("aria-label")).toBe("Close notification")
    expect(close?.classList.contains("size-icon-control-sm")).toBe(true)
    expect(frame?.classList.contains("h-toast-title-line")).toBe(true)
    expect(iconFrame?.classList.contains("h-toast-title-line")).toBe(true)
    expect(frame?.classList.contains("w-toast-close-frame")).toBe(true)
    expect(frame?.classList.contains("shrink-0")).toBe(true)
    expect(frame?.classList.contains("items-center")).toBe(true)
    expect(frame?.classList.contains("ms-auto")).toBe(true)
  })

  it("does not reserve a close frame for non-closable progress", async () => {
    const canvas = await renderToast("loading", false)
    expect(canvas.querySelector('[data-part="close-trigger"]')).toBeNull()
    expect(canvas.querySelector(".w-toast-close-frame")).toBeNull()
    expect(canvas.querySelector('[data-part="title"]')?.textContent).toBe(title)
    expect(canvas.querySelector('[data-part="description"]')?.textContent).toBe(
      description
    )
  })

  it("derives neutral copy hierarchy and line alignment from overridable theme tokens", () => {
    const tokens = new Map<string, string>()
    css.walkAtRules("theme", (theme) => {
      theme.walkDecls(({ prop, value }) => {
        tokens.set(prop, value)
      })
    })
    expect(tokens.get("--color-toast-text")).toBe("var(--color-fg-primary)")
    expect(tokens.get("--color-toast-fg-readable")).toBe(
      "var(--color-toast-text)"
    )
    expect(tokens.get("--color-toast-description")).toBe(
      "var(--color-fg-secondary)"
    )
    expect(tokens.get("--color-toast-fg-description")).toBe(
      "var(--color-toast-description)"
    )
    expect(tokens.get("--height-toast-title-line")).toBe("1lh")
    expect(tokens.get("--spacing-toast-close-frame")).toBe(
      "var(--size-toast-close-layout)"
    )
  })
})
