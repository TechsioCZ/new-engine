// @vitest-environment happy-dom
import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it } from "vitest"
import { createToaster, Toaster } from "../src/molecules/toast"

const originalShowPopover = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "showPopover"
)

let mounted: { root: Root; container: HTMLElement } | null = null

function restoreShowPopover() {
  Reflect.deleteProperty(HTMLElement.prototype, "showPopover")
  if (originalShowPopover) {
    Object.defineProperty(
      HTMLElement.prototype,
      "showPopover",
      originalShowPopover
    )
  }
}

async function mountToaster(store = createToaster()) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(() => {
    root.render(<Toaster store={store} />)
  })
  mounted = { root, container }
  return store
}

afterEach(async () => {
  if (mounted) {
    const { root, container } = mounted
    await act(() => {
      root.unmount()
    })
    container.remove()
    mounted = null
  }
  for (const node of document.querySelectorAll("[data-live-announcer]")) {
    node.remove()
  }
  restoreShowPopover()
})

describe("Toaster without a working Popover API", () => {
  it("mounts and renders toasts when showPopover is missing", async () => {
    // Simulate jsdom / older browsers: no Popover API at all.
    Reflect.deleteProperty(HTMLElement.prototype, "showPopover")

    let store: ReturnType<typeof createToaster> | undefined
    await expect(
      (async () => {
        store = await mountToaster()
      })()
    ).resolves.toBeUndefined()

    await act(() => {
      store?.create({ title: "Saved", type: "success" })
    })

    expect(document.body.textContent).toContain("Saved")
  })

  it("mounts and renders toasts when showPopover throws", async () => {
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      configurable: true,
      writable: true,
      value() {
        throw new DOMException("boom", "InvalidStateError")
      },
    })

    let store: ReturnType<typeof createToaster> | undefined
    await expect(
      (async () => {
        store = await mountToaster()
      })()
    ).resolves.toBeUndefined()

    await act(() => {
      store?.create({ title: "Still visible", type: "info" })
    })

    expect(document.body.textContent).toContain("Still visible")
  })

  it("still opens the host in the top layer when showPopover exists", async () => {
    const opened: HTMLElement[] = []
    Object.defineProperty(HTMLElement.prototype, "showPopover", {
      configurable: true,
      writable: true,
      value(this: HTMLElement) {
        opened.push(this)
      },
    })

    await mountToaster()

    expect(opened).toHaveLength(1)
    expect(opened[0]?.isConnected).toBe(true)
  })
})
