import { readFileSync } from "node:fs"
import postcss, { type AtRule, type Rule } from "postcss"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { drawerVariants } from "../src/internal/molecules/drawer.styles"
import { Drawer } from "../src/molecules/drawer"

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_drawer.css", import.meta.url),
    "utf8"
  )
)

function utility(name: string): AtRule {
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

function declaration(rule: AtRule | Rule, property: string) {
  const node = rule.nodes?.find(
    (candidate) => candidate.type === "decl" && candidate.prop === property
  )
  return node?.type === "decl" ? node.value.replace(/\s+/g, " ") : undefined
}

describe("Drawer vertical grabber clearance", () => {
  it.each([
    { direction: "down", edge: "top", section: "header" },
    { direction: "up", edge: "bottom", section: "footer" },
  ])(
    "reserves the $direction grabber outside the native scrollport",
    ({ direction, edge, section }) => {
      expect(drawerVariants().content().split(" ")).toContain(
        "drawer-grabber-clearance"
      )
      const rule = utility("drawer-grabber-clearance").nodes?.find(
        (candidate) =>
          candidate.type === "rule" &&
          candidate.selector.includes(`data-swipe-direction="${direction}"`)
      )
      if (rule?.type !== "rule") {
        throw new Error(`Missing ${direction} grabber strip`)
      }
      // A grabber belonging to a nested Drawer must not inset its ancestor.
      expect(rule.selector.replace(/\s+/g, " ")).toBe(
        `&:has( > .drawer-visible-viewport > [data-part="grabber"][data-swipe-direction="${direction}"] )`
      )
      expect(declaration(rule, `padding-${edge}`)).toBe(
        "var(--padding-drawer-grabber-clearance)"
      )
      const compensation = rule.nodes?.find(
        (candidate) =>
          candidate.type === "rule" &&
          candidate.selector ===
            `& > .drawer-visible-viewport > .drawer-${section}-clearance`
      )
      if (compensation?.type !== "rule") {
        throw new Error(`Missing ${section} padding compensation`)
      }
      expect(declaration(compensation, `padding-${edge}`)).toBe(
        `max( 0px, calc( var(--padding-drawer-${section}) - var(--padding-drawer-grabber-clearance) ) )`
      )
      // Keep the hit strip outside scrolling; do not make it click-through.
      expect(declaration(rule, "pointer-events")).toBeUndefined()
      expect(declaration(rule, "overflow")).toBeUndefined()
    }
  )

  it("preserves native detent scrolling and sticky footer behavior", () => {
    const viewport = utility("drawer-visible-viewport")
    expect(declaration(viewport, "overflow-y")).toBe("auto")
    expect(declaration(viewport, "min-height")).toBe("0")
    expect(declaration(viewport, "scroll-padding-top")).toBe(
      "var(--spacing-drawer-scroll-padding)"
    )
    const upward = viewport.nodes?.find(
      (candidate) =>
        candidate.type === "rule" &&
        candidate.selector === '[data-swipe-direction="up"] > &'
    )
    if (upward?.type !== "rule") {
      throw new Error("Missing upward detent compensation")
    }
    expect(declaration(upward, "margin-top")).toBe(
      "max(0px, calc(-1 * var(--drawer-translate-y, 0px)))"
    )
    expect(drawerVariants().body()).toContain("overflow-y-auto")
    expect(drawerVariants().body()).toContain("min-h-drawer-body-min-height")
    expect(declaration(utility("drawer-visible-footer"), "position")).toBe(
      "sticky"
    )
    expect(declaration(utility("drawer-visible-footer"), "bottom")).toBe("0")
  })

  it.each([0.25, 0.5, 1])(
    "retains content, snap state and footer semantics at the %s top detent",
    (snapPoint) => {
      const html = renderToStaticMarkup(
        <Drawer
          immediate
          open
          placement="top"
          size="full"
          snapPoint={snapPoint}
          snapPoints={[0.25, 0.5, 1]}
        >
          <Drawer.Content>
            <Drawer.Grabber>
              <Drawer.GrabberIndicator />
            </Drawer.Grabber>
            <Drawer.Header>
              <Drawer.Title>Product filters</Drawer.Title>
              <Drawer.Description>Review the whole catalog.</Drawer.Description>
            </Drawer.Header>
            <Drawer.Body>
              <Drawer.Context>
                {(api) => <p>Active height: {String(api.snapPoint)}</p>}
              </Drawer.Context>
            </Drawer.Body>
            <Drawer.Footer className="consumer-footer" data-testid="footer">
              <Drawer.CloseTrigger>Close</Drawer.CloseTrigger>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer>
      )
      expect(html).toContain('role="dialog"')
      expect(html).toContain('data-swipe-direction="up"')
      expect(html).toContain("drawer-visible-viewport")
      expect(html).toContain("drawer-footer-clearance")
      expect(html).toContain("drawer-visible-footer")
      expect(html).toContain("consumer-footer")
      expect(html).toContain("Product filters")
      expect(html).toContain("Review the whole catalog.")
      expect(html).toContain(`Active height: ${snapPoint}`)
      expect(html).toContain('data-part="close-trigger"')
      expect(html).toContain(">Close</button>")
    }
  )
})
