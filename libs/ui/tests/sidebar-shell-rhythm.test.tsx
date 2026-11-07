// @vitest-environment happy-dom
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("../src/atoms/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("storybook/preview-api", () => ({
  useArgs: () => [{}, () => undefined],
}))

import { sidebarVariants } from "../src/internal/organisms/sidebar.styles"
import {
  BreakpointFocusTransfer,
  ControlledOffcanvas,
  IconCollapseSidebar07,
  LeftAndRightSidebar15,
  LogicalEdgesRtl,
  Playground,
  RightSidebar14,
  StickySiteHeaderSidebar16,
  TwoPaneSidebar09,
} from "../stories/organisms/sidebar.stories"

function renderStory(story: typeof Playground) {
  if (!story.render) {
    throw new Error("Sidebar story must retain its authored composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    story.render(story.args ?? {}, {} as never)
  )
  return canvas
}

// SSR checks the authored sizing contract, not rendered pixel alignment, focus,
// viewport fit, or Drawer coverage. Those remain in the parent's browser cone.
describe("Sidebar shell rhythm", () => {
  it.each([
    ["expanded", Playground, 1],
    ["focus transfer", BreakpointFocusTransfer, 1],
    ["controlled offcanvas", ControlledOffcanvas, 1],
    ["collapsed rail", IconCollapseSidebar07, 1],
    ["two panes", TwoPaneSidebar09, 2],
    ["end panel", RightSidebar14, 1],
    ["dual panels", LeftAndRightSidebar15, 2],
    ["RTL panels", LogicalEdgesRtl, 2],
  ] as const)(
    "shares the authored header rhythm across %s",
    (_name, story, expectedPanelHeaders) => {
      const canvas = renderStory(story)
      const mainHeader = canvas.querySelector<HTMLElement>(
        '[data-part="inset"] > header'
      )
      const panelHeaders = canvas.querySelectorAll<HTMLElement>(
        '[data-scope="sidebar"][data-part="header"]'
      )
      expect(mainHeader).not.toBeNull()
      expect(panelHeaders).toHaveLength(expectedPanelHeaders)
      for (const header of [mainHeader, ...panelHeaders]) {
        expect(header?.style.minBlockSize).toBe("var(--spacing-700)")
        expect(header?.getAttribute("style")).toContain(
          "padding-block:var(--padding-sidebar-section-compact)"
        )
        expect(header?.style.blockSize).toBe("")
        expect(header?.style.maxBlockSize).toBe("")
        expect(header?.style.overflow).toBe("")
      }
      for (const header of panelHeaders) {
        expect(header.classList.contains("justify-center")).toBe(true)
      }
    }
  )

  it("keeps the reusable Sidebar header intrinsic outside this composition", () => {
    const classes = sidebarVariants().header().split(" ")
    expect(
      classes.some(
        (name) =>
          name.startsWith("h-") ||
          name.startsWith("min-h-") ||
          name.startsWith("max-h-")
      )
    ).toBe(false)
    expect(classes).toContain("p-sidebar-section")
    expect(classes).toContain(
      "group-data-[state=collapsed]/sidebar-panel:p-sidebar-section-compact"
    )
    expect(classes).toContain(
      "group-data-[size=rail]/sidebar-pane:p-sidebar-section-compact"
    )
  })

  it("rebinds the sticky shell viewport size where its header offset is set", () => {
    const canvas = renderStory(StickySiteHeaderSidebar16)
    const root = canvas.querySelector<HTMLElement>('[data-part="root"]')
    const siteHeader = canvas.querySelector<HTMLElement>(
      '[data-testid="site-header"]'
    )
    const row = canvas.querySelector('[data-testid="application-row"]')
    expect(root?.style.getPropertyValue("--spacing-sidebar-offset")).toBe(
      "var(--spacing-700)"
    )
    // An inherited derived custom property would retain its ancestor's zero
    // offset; resolving it here avoids adding a full viewport below the header.
    expect(root?.style.getPropertyValue("--height-sidebar-viewport")).toBe(
      "calc(100dvh - var(--spacing-sidebar-offset))"
    )
    expect(siteHeader?.style.blockSize).toBe("var(--spacing-sidebar-offset)")
    expect(siteHeader?.style.flexShrink).toBe("0")
    expect(siteHeader?.parentElement).toBe(root)
    expect(row?.parentElement).toBe(root)
    expect(row?.querySelector('[data-part="panel"]')).not.toBeNull()
    expect(row?.querySelector('[data-part="inset"]')).not.toBeNull()
    expect(row?.querySelector(".min-h-screen, .h-screen")).toBeNull()
    expect(row?.textContent).toContain("Settings")
    expect(row?.textContent).toContain("$48,290")
  })
})
