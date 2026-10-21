import { createElement, createRef, type ReactNode, type RefObject } from "react"
import { createPortal } from "react-dom"
import { renderToStaticMarkup } from "react-dom/server"
import { expect, test, vi } from "vitest"
import { Tooltip } from "../src/atoms/tooltip"
import {
  OverlayContainerProvider,
  OverlayPortal,
  restoreFocusAfterOverlayClose,
} from "../src/internal/overlay-portal"
import { Popover } from "../src/molecules/popover"
import { PopoverTemplate } from "../src/templates/popover"

// Observe target selection without mutating a DOM owned by React. Browser stories
// separately cover real mounting, focus scopes, nested modals and portal cleanup.
vi.mock("react-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-dom")>()),
  createPortal: vi.fn((children: ReactNode) => children),
}))

function template(props: Partial<Parameters<typeof PopoverTemplate>[0]> = {}) {
  return renderToStaticMarkup(
    createElement(PopoverTemplate, {
      defaultOpen: true,
      trigger: "Delivery details",
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: "Standard delivery takes 2–4 days.",
      ...props,
    })
  )
}

test("untitled template panels fall back to a useful trigger name", () => {
  expect(template()).toContain('aria-label="Delivery details"')
})

test("explicit content naming takes precedence over the fallback", () => {
  expect(template({ "aria-label": "Shipping options" })).toContain(
    'aria-label="Shipping options"'
  )
  expect(
    template({
      "aria-label": "Shipping options",
      contentProps: { "aria-label": "Express delivery" },
    })
  ).toContain('aria-label="Express delivery"')
})

test("tooltip forwards custom element IDs and accessible labels", () => {
  const markup = renderToStaticMarkup(
    createElement(Tooltip, {
      content: "Hint",
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: "Trigger",
      defaultOpen: true,
      "aria-label": "Delivery hint",
      ids: {
        content: "hint-content",
        trigger: "hint-trigger",
        positioner: "hint-positioner",
        arrow: "hint-arrow",
      },
      positioning: { placement: "top", gutter: 12 },
    })
  )
  for (const id of [
    "hint-content",
    "hint-trigger",
    "hint-positioner",
    "hint-arrow",
  ]) {
    expect(markup).toContain(`id="${id}"`)
  }
  expect(markup).toContain('aria-label="Delivery hint"')
  expect(markup).toContain('role="tooltip"')
})

test("icon-only popover close preserves the caller's name and size", () => {
  const markup = renderToStaticMarkup(
    createElement(Popover, {
      defaultOpen: true,
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: createElement(Popover.CloseTrigger, {
        "aria-label": "Dismiss delivery details",
        size: "sm",
      }),
    })
  )
  expect(markup).toContain('aria-label="Dismiss delivery details"')
  expect(markup).toContain("size-icon-control-sm")
})

test("overlay portals render server-safe children without resolving a DOM root", () => {
  const getRootNode = () => {
    throw new Error("Server rendering must not resolve a DOM root")
  }
  const markup = renderToStaticMarkup(
    createElement(OverlayContainerProvider, {
      container: null,
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: createElement(OverlayPortal, {
        getRootNode,
        // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
        children: createElement("span", null, "Nested popup"),
      }),
    })
  )
  expect(markup).toBe("<span>Nested popup</span>")
})

test("disabled overlay portals preserve their children during server rendering", () => {
  const markup = renderToStaticMarkup(
    createElement(OverlayPortal, {
      disabled: true,
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: createElement("button", { type: "button" }, "Inline popup"),
    })
  )
  expect(markup).toContain("Inline popup")
})

function observePortalTarget(
  props: Omit<Parameters<typeof OverlayPortal>[0], "children"> = {},
  containers: (HTMLElement | null)[] = []
) {
  const document = { body: {} } as Document
  vi.stubGlobal("document", document)
  vi.mocked(createPortal).mockClear()
  try {
    let node: ReactNode = createElement(OverlayPortal, {
      ...props,
      // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
      children: "Popup",
    })
    for (const container of [...containers].reverse()) {
      node = createElement(OverlayContainerProvider, {
        container,
        // biome-ignore lint/correctness/noChildrenProp: createElement needs required children in the typed props argument.
        children: node,
      })
    }
    const markup = renderToStaticMarkup(node)
    return {
      document,
      markup,
      target: vi.mocked(createPortal).mock.calls[0]?.[1],
    }
  } finally {
    vi.unstubAllGlobals()
  }
}

test("explicit portal containers take precedence over the nearest modal", () => {
  const explicit = {} as HTMLElement
  const modal = {} as HTMLElement
  expect(
    observePortalTarget({ container: { current: explicit } }, [modal]).target
  ).toBe(explicit)
})

test("a pending nested modal inherits its parent until its own container exists", () => {
  const parent = {} as HTMLElement
  const child = {} as HTMLElement
  expect(observePortalTarget({}, [parent, null]).target).toBe(parent)
  expect(observePortalTarget({}, [parent, child]).target).toBe(child)
})

test("an unset explicit container falls back to the nearest modal", () => {
  const modal = {} as HTMLElement
  expect(
    observePortalTarget(
      { container: createRef<HTMLElement>() as RefObject<HTMLElement> },
      [modal]
    ).target
  ).toBe(modal)
})

test("unscoped portals respect document and shadow root environments", () => {
  const document = { nodeType: 9, body: {} } as Document
  const shadowRoot = { nodeType: 11, ownerDocument: document } as ShadowRoot
  expect(observePortalTarget({ getRootNode: () => document }).target).toBe(
    document.body
  )
  expect(observePortalTarget({ getRootNode: () => shadowRoot }).target).toBe(
    shadowRoot
  )
  const fallback = observePortalTarget()
  expect(fallback.target).toBe(fallback.document.body)
})

function focusRestorationFixture() {
  const frames = new Map<number, FrameRequestCallback>()
  let sequence = 0
  const doc = {
    body: {},
    activeElement: null as unknown,
    defaultView: {
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        sequence += 1
        frames.set(sequence, callback)
        return sequence
      }),
      cancelAnimationFrame: vi.fn((id: number) => frames.delete(id)),
    },
  }
  doc.activeElement = doc.body
  const content = {
    ownerDocument: doc,
    isConnected: true,
    hidden: false,
    contains: (node: unknown) => node === content,
  }
  const target = {
    isConnected: true,
    matches: vi.fn(() => false),
    closest: vi.fn(() => null),
    focus: vi.fn(() => {
      doc.activeElement = target
    }),
  }
  const restore = () =>
    restoreFocusAfterOverlayClose(
      content as unknown as HTMLElement,
      () => target as unknown as HTMLElement
    )
  const tick = () => {
    const queued = [...frames.values()]
    frames.clear()
    for (const callback of queued) {
      callback(0)
    }
  }
  return { doc, content, target, restore, tick, frames }
}

test("overlay focus waits for actual unmount, then survives deferred cleanup", () => {
  const { doc, content, target, restore, tick, frames } =
    focusRestorationFixture()
  restore()
  tick()
  tick()
  expect(target.focus).not.toHaveBeenCalled()
  content.isConnected = false
  tick()
  expect(doc.activeElement).toBe(target)
  // A later focus-trap cleanup loses focus after the first successful RAF.
  doc.activeElement = doc.body
  tick()
  expect(doc.activeElement).toBe(target)
  tick()
  expect(frames.size).toBe(0)
})

test("overlay focus does not steal intentional outside focus", () => {
  const { doc, content, target, restore, tick, frames } =
    focusRestorationFixture()
  restore()
  content.isConnected = false
  doc.activeElement = {}
  tick()
  expect(target.focus).not.toHaveBeenCalled()
  expect(frames.size).toBe(0)
})

test("overlay focus retries a temporarily unavailable trigger and can be cancelled", () => {
  const { content, target, restore, tick, frames } = focusRestorationFixture()
  content.hidden = true
  target.isConnected = false
  const cancel = restore()
  tick()
  expect(target.focus).not.toHaveBeenCalled()
  target.isConnected = true
  tick()
  expect(target.focus).toHaveBeenCalledOnce()
  cancel()
  expect(frames.size).toBe(0)
  tick()
  expect(target.focus).toHaveBeenCalledOnce()
})

test("overlay focus retries are bounded when the parent refuses to close", () => {
  const { target, restore, tick, frames } = focusRestorationFixture()
  restore()
  for (let frame = 0; frame < 40; frame++) {
    tick()
  }
  expect(frames.size).toBe(0)
  expect(target.focus).not.toHaveBeenCalled()
})

test("disabled client portals stay inline and never resolve or create a portal", () => {
  const getRootNode = vi.fn(() => ({}) as Document)
  const result = observePortalTarget({ disabled: true, getRootNode })
  expect(result.markup).toBe("Popup")
  expect(createPortal).not.toHaveBeenCalled()
  expect(getRootNode).not.toHaveBeenCalled()
})
