// @vitest-environment happy-dom
import { act, createRef, createElement as h } from "react"
import { createRoot, type Root } from "react-dom/client"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Dialog } from "../src/molecules/dialog"
import { Drawer, useDrawer } from "../src/molecules/drawer"

/**
 * Dialog and Drawer props consumed by applications without a local patch: the close button's
 * accessible name, the content element ref and inline content styles, and the pointer-events
 * layers that Zag's modal and modeless behaviour depend on.
 */

const CLOSE_BUTTON = /<button\b[^>]*data-part="close-trigger"[^>]*>/
const POSITIONER = /<div\b[^>]*data-part="positioner"[^>]*>/
const DRAWER_BACKDROP = /<div\b[^>]*data-part="backdrop"[^>]*>/
const DIALOG_CONTENT = /<div\b[^>]*data-part="content"[^>]*>/

function renderDialog(props: Record<string, unknown>) {
  return renderToStaticMarkup(
    h(Dialog, {
      id: "contract-dialog",
      open: true,
      portal: false,
      title: "Title",
      triggerText: "Open",
      ...props,
    })
  )
}

describe("Dialog closeLabel", () => {
  it("keeps 'Close dialog' as the default accessible name of the close button", () => {
    const html = renderDialog({})
    expect(html.match(CLOSE_BUTTON)?.[0]).toContain('aria-label="Close dialog"')
  })

  it("names the close button with the closeLabel prop", () => {
    const html = renderDialog({ closeLabel: "Dismiss settings" })
    expect(html.match(CLOSE_BUTTON)?.[0]).toContain(
      'aria-label="Dismiss settings"'
    )
  })
})

describe("Dialog contentStyle", () => {
  it("merges inline overrides into the machine content styles", () => {
    const html = renderDialog({ contentStyle: { zIndex: 7 } })
    const content = html.match(DIALOG_CONTENT)?.[0]
    expect(content).toBeDefined()
    expect(content).toContain("z-index:7")
  })
})

describe("Dialog pointer events", () => {
  it("lets the modal positioner receive pointer events", () => {
    const html = renderDialog({ behavior: "modal" })
    expect(html.match(POSITIONER)?.[0]).toContain("pointer-events-auto")
  })

  it("does not add the modal positioner class in modeless behaviour", () => {
    const html = renderDialog({ behavior: "modeless" })
    expect(html.match(POSITIONER)?.[0]).not.toContain("pointer-events-auto")
  })
})

describe("Drawer.Backdrop pointer events", () => {
  function renderDrawer(rootProps: Record<string, unknown>) {
    return renderToStaticMarkup(
      h(
        Drawer.Root,
        { open: true, lazyMount: false, ...rootProps },
        h(Drawer.Backdrop),
        h(Drawer.Positioner)
      )
    )
  }

  it("gives a modal backdrop pointer events by default", () => {
    const html = renderDrawer({})
    expect(html.match(DRAWER_BACKDROP)?.[0]).toContain("pointer-events-auto")
  })

  it("does not add the modal class when the root is modeless", () => {
    const html = renderDrawer({ modal: false })
    expect(html.match(DRAWER_BACKDROP)?.[0]).not.toContain(
      "pointer-events-auto"
    )
  })
})

function DrawerProviderHarness({ modal }: { modal: boolean }) {
  const api = useDrawer({ open: true, modal })
  return h(
    Drawer.RootProvider,
    { value: api, lazyMount: false },
    h(Drawer.Backdrop),
    h(Drawer.Positioner)
  )
}

describe("Drawer.RootProvider backdrop pointer events", () => {
  it("does not add the modal class for a modeless useDrawer api", () => {
    const html = renderToStaticMarkup(
      h(DrawerProviderHarness, { modal: false })
    )
    expect(html.match(DRAWER_BACKDROP)?.[0]).not.toContain(
      "pointer-events-auto"
    )
  })

  it("adds the modal class for a modal useDrawer api", () => {
    const html = renderToStaticMarkup(h(DrawerProviderHarness, { modal: true }))
    expect(html.match(DRAWER_BACKDROP)?.[0]).toContain("pointer-events-auto")
  })

  it("does not inherit a modeless outer Drawer.Root", () => {
    const html = renderToStaticMarkup(
      h(
        Drawer.Root,
        { open: true, lazyMount: false, modal: false },
        h(DrawerProviderHarness, { modal: true })
      )
    )
    const backdrops = html.match(new RegExp(DRAWER_BACKDROP.source, "g")) ?? []
    expect(backdrops.at(-1)).toContain("pointer-events-auto")
  })

  it("does not inherit a modal outer Drawer.Root", () => {
    const html = renderToStaticMarkup(
      h(
        Drawer.Root,
        { open: true, lazyMount: false, modal: true },
        h(DrawerProviderHarness, { modal: false })
      )
    )
    const backdrops = html.match(new RegExp(DRAWER_BACKDROP.source, "g")) ?? []
    expect(backdrops.at(-1)).not.toContain("pointer-events-auto")
  })
})

describe("Dialog contentRef", () => {
  let root: Root | undefined

  beforeEach(() => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true)
  })

  afterEach(async () => {
    await act(async () => root?.unmount())
    root = undefined
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it("attaches contentRef to the dialog content element", async () => {
    const contentRef = createRef<HTMLDivElement>()
    const container = document.createElement("div")
    document.body.append(container)
    root = createRoot(container)

    await act(async () =>
      root?.render(
        h(Dialog, {
          id: "ref-dialog",
          open: true,
          portal: false,
          title: "Title",
          contentRef,
        })
      )
    )

    const content = container.querySelector<HTMLDivElement>(
      '[data-part="content"]'
    )
    expect(content).not.toBeNull()
    expect(contentRef.current).toBe(content)
  })
})
