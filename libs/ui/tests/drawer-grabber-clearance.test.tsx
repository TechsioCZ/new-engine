import { existsSync, readFileSync } from "node:fs"
import postcss from "postcss"
import { cloneElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { drawerVariants } from "../src/internal/molecules/drawer.styles"
import { SnapPointsAndSwipe } from "../stories/molecules/drawer.stories"

vi.mock("@zag-js/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@zag-js/react")>()),
  Portal: ({ children }: { children: ReactElement }) => children,
}))

const spacingArithmetic = /^[\d\s()+*/.-]+$/
const snapLabel = /^\d+%$/
const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")
const css = postcss.parse(
  read("../src/tokens/components/molecules/_drawer.css")
)
const proposalPath = new URL(
  "../build/council-full-v4-review/build/fixes/molecules-drawer-business.json",
  import.meta.url
)
// The parent owns integration. After integration these checks resolve the same
// aliases from _business.css and no longer need the staged, ignored proposal.
const proposal = existsSync(proposalPath)
  ? (JSON.parse(readFileSync(proposalPath, "utf8")) as {
      aliases: Record<string, string>
    })
  : { aliases: {} }

function utility(name: string) {
  const node = css.nodes.find(
    (candidate) =>
      candidate.type === "atrule" &&
      candidate.name === "utility" &&
      candidate.params === name
  )
  if (node?.type !== "atrule") {
    throw new Error(`Missing Drawer utility: ${name}`)
  }
  return node
}

function tokens(business: boolean) {
  const values: Record<string, string> = {}
  for (const source of [
    read("../src/tokens/figma/variables.css"),
    css.toString(),
    ...(business ? [read("../src/tokens/_business.css")] : []),
  ]) {
    postcss.parse(source).walkDecls((declaration) => {
      if (declaration.prop.startsWith("--")) {
        values[declaration.prop] = declaration.value
      }
    })
  }
  return business ? { ...values, ...proposal.aliases } : values
}

// Arithmetic over authored spacing aliases, not a substitute for browser layout.
function pixels(value: string, values: Record<string, string>): number {
  const expression = value
    .replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
      if (!values[name]) {
        throw new Error(`Missing spacing alias: ${name}`)
      }
      return String(pixels(values[name], values))
    })
    .replace(/([\d.]+)rem/g, (_, number: string) => String(Number(number) * 16))
    .replace(/px/g, "")
    .replace(/calc\(/g, "(")
  if (!spacingArithmetic.test(expression)) {
    throw new Error(`Not spacing arithmetic: ${expression}`)
  }
  // The character whitelist above excludes identifiers and executable code.
  return Function(`return (${expression})`)() as number
}

function spacing(name: string, business = true) {
  const values = tokens(business)
  const value = values[name]
  if (value === undefined) {
    throw new Error(`Missing Drawer spacing alias: ${name}`)
  }
  return pixels(value, values)
}

describe("Drawer grabber clearance", () => {
  it("reserves the handle strip on Content, not in the scrolling viewport", () => {
    const styles = drawerVariants()
    expect(styles.content().split(" ")).toContain("drawer-grabber-clearance")
    expect(styles.header().split(" ")).toContain("drawer-header-clearance")
    const clearance = utility("drawer-grabber-clearance")
    const selector = clearance.nodes?.find((node) => node.type === "rule")
    expect(selector?.type).toBe("rule")
    if (selector?.type !== "rule") {
      throw new Error(
        "Grabber clearance must be conditional on its own grabber"
      )
    }
    expect(selector.selector.replace(/\s+/g, " ")).toContain(
      '> .drawer-visible-viewport > [data-part="grabber"][data-swipe-direction="down"]'
    )
    const properties: Record<string, string> = {}
    selector.walkDecls((declaration) => {
      properties[declaration.prop] = declaration.value
    })
    expect(properties["padding-top"]).toContain(
      "var(--padding-drawer-grabber-clearance)"
    )
    expect(properties["padding-top"]).toContain("var(--padding-drawer-header)")
    const strip = spacing("--padding-drawer-grabber-clearance")
    const handleExtent =
      2 * spacing("--padding-drawer-grabber") +
      spacing("--height-drawer-grabber-thickness")
    expect(strip).toBeGreaterThanOrEqual(handleExtent)
    // Counterfactual: the former zero-inset scrolling edge intersects the grip.
    expect(0).toBeLessThan(handleExtent)
    expect(utility("drawer-visible-viewport").toString()).toContain(
      "scroll-padding-top: var(--spacing-drawer-scroll-padding)"
    )
    expect(styles.body()).toContain("min-h-drawer-body-min-height")
  })

  it("keeps the authored mobile header and control group clear of the pinned footer", () => {
    // Frozen mobile viewport; 44px touch actions and the existing 12px story gap.
    const quarter = 659 * 0.25
    const titleLine = 24
    const descriptionLine = 20
    const statusLine = 20
    const control = 44
    const storyGap = 12
    const border = 1
    const strip = spacing("--padding-drawer-grabber-clearance")
    const headerPadding = spacing("--padding-drawer-header")
    const header =
      Math.max(0, headerPadding - strip) +
      titleLine +
      spacing("--gap-drawer-header") +
      descriptionLine +
      headerPadding +
      border
    const footer = control + 2 * spacing("--padding-drawer-footer") + border
    expect(border + strip + header + footer).toBeLessThan(quarter)
    const exposedContent = quarter - border - strip - footer
    expect(statusLine + storyGap + control).toBeLessThan(exposedContent)
    const scrollInset = spacing("--spacing-drawer-scroll-padding")
    expect(scrollInset).toBeGreaterThanOrEqual(statusLine + storyGap)
    expect(scrollInset + control).toBeLessThan(exposedContent)
    const bodyPadding = 2 * spacing("--padding-drawer-body")
    expect(
      spacing("--spacing-drawer-body-min-height") - bodyPadding
    ).toBeGreaterThanOrEqual(statusLine + storyGap + control)
    // Original spacing cannot fit the header/footer or the touch-sized Body row.
    const previousHeader = 24 * 2 + titleLine + 8 + descriptionLine + border
    const previousFooter = 24 * 2 + control + border
    expect(previousHeader + previousFooter).toBeGreaterThan(quarter)
    expect(120 - bodyPadding).toBeLessThan(statusLine + storyGap + control)
  })

  it("leaves the pre-existing Base/Neo/Akros spacing defaults untouched", () => {
    expect(spacing("--padding-drawer-header", false)).toBe(24)
    expect(spacing("--padding-drawer-footer", false)).toBe(24)
    expect(spacing("--padding-drawer-grabber-clearance", false)).toBe(0)
    expect(spacing("--spacing-drawer-scroll-padding", false)).toBe(0)
    expect(spacing("--spacing-drawer-body-min-height", false)).toBe(120)
  })
})

describe("Drawer snap state", () => {
  it.each([0.25, 0.5, 1])(
    "marks only the actual %s snap as pressed",
    (snapPoint) => {
      if (!SnapPointsAndSwipe.render) {
        throw new Error("The snap story must retain its render contract")
      }
      const root = SnapPointsAndSwipe.render(
        {} as never,
        {} as never
      ) as ReactElement
      const html = renderToStaticMarkup(
        cloneElement(root, { open: true, snapPoint, immediate: true } as never)
      )
      const buttons = [
        ...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/gs),
      ].filter(([, , text]) => snapLabel.test(text ?? ""))
      expect(buttons).toHaveLength(3)
      for (const [, attributes, label] of buttons) {
        const selected = label === `${snapPoint * 100}%`
        expect(attributes).toContain(`aria-pressed="${selected}"`)
        if (selected) {
          expect(attributes).toContain("bg-button-bg-primary-base")
        } else {
          expect(attributes).toContain("border-button-border-tertiary")
        }
      }
    }
  )
})
