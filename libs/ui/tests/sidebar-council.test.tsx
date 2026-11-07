// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Inspect the authored mobile controls in the server-rendered story composition;
// this does not simulate Drawer layout, focus management, or dismissal.
vi.mock("../src/organisms/sidebar", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/organisms/sidebar")>()
  const { Sidebar } = actual
  const originalTrigger = Sidebar.Trigger
  const originalCloseTrigger = Sidebar.CloseTrigger
  return {
    ...actual,
    Sidebar: Object.assign(
      (props: Parameters<typeof Sidebar>[0]) => <Sidebar {...props} />,
      Sidebar,
      {
        Trigger: ({
          "aria-label": label,
          icon = "token-icon-sidebar-trigger",
          side = "start",
        }: Parameters<typeof originalTrigger>[0]) => (
          <button
            aria-label={label}
            data-icon={icon}
            data-side={side}
            type="button"
          />
        ),
        CloseTrigger: ({
          "aria-label": label,
        }: Parameters<typeof originalCloseTrigger>[0]) => (
          <button aria-label={label} data-mobile-close="" type="button" />
        ),
      }
    ),
  }
})

vi.mock("../src/atoms/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("storybook/preview-api", () => ({
  useArgs: () => [{}, () => undefined],
}))

import {
  ControlledOffcanvas,
  IconCollapseSidebar07,
  LeftAndRightSidebar15,
  LogicalEdgesRtl,
  Playground,
  StickySiteHeaderSidebar16,
  TwoPaneSidebar09,
} from "../stories/organisms/sidebar.stories"

function renderStory(story: typeof TwoPaneSidebar09) {
  if (!story.render) {
    throw new Error("Sidebar story must retain its authored composition")
  }
  const canvas = document.createElement("div")
  canvas.innerHTML = renderToStaticMarkup(
    story.render(story.args ?? {}, {} as never)
  )
  return canvas
}

const sidebarCss = readFileSync(
  "src/tokens/components/organisms/_sidebar.css",
  "utf8"
)

function declaration(source: string, name: string): string {
  const value = source.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value.trim()
}

describe("Sidebar council story composition", () => {
  it.each([
    ["default", Playground],
    ["controlled", ControlledOffcanvas],
    ["collapsed", IconCollapseSidebar07],
    ["dual", LeftAndRightSidebar15],
    ["RTL", LogicalEdgesRtl],
    ["sticky site header", StickySiteHeaderSidebar16],
    ["two-pane", TwoPaneSidebar09],
  ] as const)(
    "does not add a second viewport below the %s shell header",
    (_name, story) => {
      const canvas = renderStory(story)
      const main = canvas.querySelector('[data-part="inset"]')
      expect(main?.className).toContain("min-h-sidebar-viewport")
      expect(main?.querySelector(".min-h-screen")).toBeNull()
      expect(main?.querySelector(".h-screen")).toBeNull()
      expect(main?.textContent).toContain("Revenue, orders, and catalog")
      expect(main?.textContent).toContain("$48,290")
    }
  )

  it("keeps the two-pane close control in the contextual header", () => {
    const canvas = renderStory(TwoPaneSidebar09)
    const detail = canvas.querySelector('[data-testid="detail-pane"]')
    const header = detail?.querySelector('[data-part="header"]')
    expect(header?.textContent).toContain("Inbox")
    expect(
      header?.querySelector(
        '[data-mobile-close][aria-label="Close workspace navigation"]'
      )
    ).not.toBeNull()
    expect(canvas.querySelectorAll('[data-part="pane"]')).toHaveLength(2)
    expect(detail?.textContent).toContain("Assigned to me")
    expect(detail?.textContent).toContain("Recently updated")
    expect(detail?.textContent).toContain("All items")
  })

  it("gives every physical-rail link the full equally inset width", () => {
    const canvas = renderStory(TwoPaneSidebar09)
    const links = canvas.querySelectorAll(
      '[data-part="pane"][data-size="rail"] a'
    )
    expect(links).toHaveLength(5)
    for (const link of links) {
      expect(link.className).toContain("w-full")
      expect(link.className).toContain("sidebar-navigation-link")
    }
  })

  it.each([LeftAndRightSidebar15, LogicalEdgesRtl])(
    "distinguishes primary and contextual launchers without changing logical sides",
    (story) => {
      const canvas = renderStory(story)
      const start = canvas.querySelector('button[data-icon][data-side="start"]')
      const end = canvas.querySelector('button[data-icon][data-side="end"]')
      expect(start?.getAttribute("data-icon")).toBe(
        "token-icon-sidebar-trigger"
      )
      expect(end?.getAttribute("data-icon")).not.toBe(
        start?.getAttribute("data-icon")
      )
      expect(end?.getAttribute("aria-label")).toBe("Toggle end navigation")
    }
  )

  it("owns compact inline padding for both collapsed panels and physical rails", () => {
    expect(sidebarCss).toContain(
      '[data-scope="sidebar"][data-part="panel"][data-state="collapsed"]'
    )
    expect(sidebarCss).toContain(
      '[data-scope="sidebar"][data-part="pane"][data-size="rail"]'
    )
    expect(sidebarCss).toContain(
      "padding-inline: var(--padding-sidebar-navigation-compact)"
    )
    // Preserve the composed Button's default padding in non-Business themes.
    expect(declaration(sidebarCss, "--spacing-sidebar-navigation-inset")).toBe(
      "var(--padding-button-x-sm)"
    )
    expect(
      declaration(sidebarCss, "--padding-sidebar-navigation-compact")
    ).toBe("var(--spacing-sidebar-navigation-inset)")
  })
})
