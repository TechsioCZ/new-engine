import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("../src/atoms/tooltip", () => ({
  Tooltip: ({
    children,
    content,
    dir,
    placement,
  }: {
    children: ReactNode
    content: ReactNode
    dir: string
    placement: string
  }) => (
    <span data-dir={dir} data-tooltip-placement={placement}>
      {children}
      {content}
    </span>
  ),
}))

import {
  SidebarProvider,
  type SidebarSide,
  useSidebarState,
} from "../src/internal/organisms/sidebar.context"
import { Sidebar } from "../src/organisms/sidebar"

function TriggerFixture({
  dir,
  isDesktop,
  side,
  tooltip,
}: {
  dir: "ltr" | "rtl"
  isDesktop: boolean
  side: SidebarSide
  tooltip?: ReactNode
}) {
  const state = useSidebarState({ dir })
  return (
    <SidebarProvider value={{ ...state, isDesktop }}>
      <Sidebar.Trigger
        aria-label={`Toggle ${side} navigation`}
        side={side}
        tooltip={tooltip}
      />
    </SidebarProvider>
  )
}

// This checks the placement policy only. Browser tests own actual hit testing,
// restored focus, modal isolation, and the start-to-end handoff.
describe("Sidebar trigger tooltip placement", () => {
  it.each([
    ["ltr", "start"],
    ["ltr", "end"],
    ["rtl", "start"],
    ["rtl", "end"],
  ] as const)(
    "keeps the %s mobile %s hint out of the inline toolbar",
    (dir, side) => {
      const markup = renderToStaticMarkup(
        <TriggerFixture dir={dir} isDesktop={false} side={side} />
      )
      expect(markup).toContain('data-tooltip-placement="bottom"')
      expect(markup).toContain(`data-dir="${dir}"`)
      expect(markup).toContain(`aria-label="Toggle ${side} navigation"`)
      expect(markup).toContain('aria-haspopup="dialog"')
    }
  )

  it.each([
    ["ltr", "start", "right"],
    ["ltr", "end", "left"],
    ["rtl", "start", "left"],
    ["rtl", "end", "right"],
  ] as const)(
    "preserves the %s desktop %s rail hint on the %s",
    (dir, side, placement) => {
      const markup = renderToStaticMarkup(
        <TriggerFixture dir={dir} isDesktop side={side} />
      )
      expect(markup).toContain(`data-tooltip-placement="${placement}"`)
    }
  )

  it("preserves custom tooltip content and the explicit opt-out", () => {
    const props = { dir: "rtl", isDesktop: false, side: "end" } as const
    expect(
      renderToStaticMarkup(
        <TriggerFixture {...props} tooltip={<strong>Context help</strong>} />
      )
    ).toContain("<strong>Context help</strong>")
    const withoutTooltip = renderToStaticMarkup(
      <TriggerFixture {...props} tooltip={null} />
    )
    expect(withoutTooltip).not.toContain("data-tooltip-placement")
    expect(withoutTooltip).toContain('aria-label="Toggle end navigation"')
  })
})
