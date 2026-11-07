import { readFileSync } from "node:fs"
import postcss, { type AtRule, type Declaration, type Rule } from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Tabs } from "../src/molecules/tabs"

const TABLIST_TAG = /<div\b[^>]*role="tablist"[^>]*>/
const VIEWPORT_AND_TABLIST =
  /<div class="[^"]*tabs-list-viewport[^"]*"><div[^>]*role="tablist"/
const DISABLED_TAB_TAG = /<button\b[^>]*data-value="details"[^>]*>/
const DISABLED_ATTRIBUTE = /\sdisabled=""/
const TAB_ROLE = /role="tab"/g
const BUTTON_TAG = /<button\b/g
const CLIPPING_OR_MOTION = /mask|clip|opacity|animation/
const RIGHT_COVER = /^linear-gradient\(\s*to right,/
const LEFT_COVER = /^linear-gradient\(\s*to left,/

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_tabs.css", import.meta.url),
    "utf8"
  )
)

function utility(name: string) {
  const rule = css.nodes.find(
    (node): node is AtRule =>
      node.type === "atrule" && node.name === "utility" && node.params === name
  )
  if (!rule) {
    throw new Error(`Missing Tabs presentation utility: ${name}`)
  }
  return rule
}

function declarations(rule: AtRule | Rule) {
  return Object.fromEntries(
    (rule.nodes ?? [])
      .filter((node): node is Declaration => node.type === "decl")
      .map((node) => [node.prop, node.value])
  )
}

function tokens() {
  const values: Record<string, string> = {}
  css.walkDecls((declaration) => {
    if (declaration.prop.startsWith("--")) {
      values[declaration.prop] = declaration.value
    }
  })
  return values
}

function renderTabs(orientation: "horizontal" | "vertical" = "horizontal") {
  return renderToStaticMarkup(
    h(
      Tabs,
      { defaultValue: "overview", orientation, variant: "line" },
      h(
        Tabs.List,
        { "aria-label": "Project views" },
        h(Tabs.Trigger, { value: "overview" }, "Overview"),
        h(Tabs.Trigger, { disabled: true, value: "details" }, "Details"),
        h(Tabs.Trigger, { value: "settings" }, "Settings")
      )
    )
  )
}

// These are SSR/CSS contracts, not substitutes for Chromium/WebKit paint checks.
describe("Tabs overflow and unavailable presentation", () => {
  it("wires the overflow cue to the real tablist without adding navigation controls", () => {
    const html = renderTabs()
    const list = html.match(TABLIST_TAG)?.[0]
    expect(list).toContain("tabs-list-overflow")
    expect(list).toContain("overflow-x-auto")
    expect(html.match(TAB_ROLE)).toHaveLength(3)
    expect(html).toContain("Settings")
    expect(html.match(BUTTON_TAG)).toHaveLength(3)
  })

  it("uses local covers and scrollport shadows on horizontal lists only, never a focus-clipping mask", () => {
    const overflow = utility("tabs-list-overflow")
    const horizontal = overflow.nodes?.find(
      (node): node is Rule =>
        node.type === "rule" &&
        node.selector === '&[data-orientation="horizontal"]'
    )
    expect(horizontal).toBeDefined()
    const paint = declarations(horizontal as Rule)
    const layers = postcss.list.comma(paint["background-image"] ?? "")
    expect(layers).toHaveLength(4)
    expect(layers[0]).toMatch(RIGHT_COVER)
    expect(layers[1]).toMatch(LEFT_COVER)
    expect(layers[2]).toContain("at 0 50%")
    expect(layers[3]).toContain("at 100% 50%")
    expect(
      layers
        .slice(0, 2)
        .every((layer) => layer.includes("--color-tabs-overflow-bg-cover"))
    ).toBe(true)
    expect(
      layers
        .slice(2)
        .every((layer) => layer.includes("--color-tabs-overflow-bg-cue"))
    ).toBe(true)
    expect(postcss.list.comma(paint["background-attachment"] ?? "")).toEqual([
      "local",
      "local",
      "scroll",
      "scroll",
    ])
    expect(postcss.list.comma(paint["background-position"] ?? "")).toEqual([
      "left center",
      "right center",
      "left center",
      "right center",
    ])
    expect(postcss.list.comma(paint["background-size"] ?? "")).toEqual([
      "var(--spacing-tabs-overflow-cover) 100%",
      "var(--spacing-tabs-overflow-cover) 100%",
      "var(--spacing-tabs-overflow-cue) 100%",
      "var(--spacing-tabs-overflow-cue) 100%",
    ])
    expect(paint["background-repeat"]).toBe("no-repeat")
    expect(declarations(overflow)).toEqual({})
    overflow.walkDecls((declaration) => {
      expect(declaration.prop).not.toMatch(CLIPPING_OR_MOTION)
    })
    expect(renderTabs("vertical")).toContain('data-orientation="vertical"')
  })

  it("hosts physical-edge surface veils outside list geometry and below keyboard focus", () => {
    const html = renderTabs()
    expect(html).toMatch(VIEWPORT_AND_TABLIST)
    const viewport = utility("tabs-list-viewport")
    expect(declarations(viewport)).toEqual({ display: "contents" })
    const rules = viewport.nodes?.filter(
      (node): node is Rule => node.type === "rule"
    )
    const horizontal = rules?.[0] as Rule
    expect(horizontal.selector).toBe(
      '&:has(> [data-part="list"][data-orientation="horizontal"])'
    )
    expect(declarations(horizontal)).toEqual({
      position: "relative",
      display: "block",
      isolation: "isolate",
    })
    const paint = new Map<string, Record<string, string>>()
    horizontal.walkRules((rule) => {
      paint.set(rule.selector, declarations(rule))
    })
    expect(paint.get('> [data-part="list"][data-overflow-left]')).toEqual({
      "background-image": "none",
    })
    const shared = paint.get("&::before,\n    &::after")
    expect(shared?.position).toBe("absolute")
    expect(shared?.width).toBe("var(--spacing-tabs-overflow-cue)")
    expect(shared?.["pointer-events"]).toBe("none")
    for (const [side, pseudo, gradient] of [
      ["left", "before", RIGHT_COVER],
      ["right", "after", LEFT_COVER],
    ] as const) {
      const edge = paint.get(
        `&:has(> [data-overflow-${side}="true"])::${pseudo}`
      )
      expect(edge?.[side]).toBe("0")
      expect(edge?.["background-image"]).toMatch(gradient)
      expect(edge?.["background-image"]).toContain(
        "--color-tabs-overflow-bg-veil"
      )
    }
    expect(tokens()["--color-tabs-overflow-bg-veil"]).toBe(
      "var(--color-tabs-overflow)"
    )
    const focus = utility("tabs-trigger-focus").nodes?.find(
      (node): node is Rule => node.type === "rule"
    ) as Rule
    expect(focus.selector).toBe("&:focus-visible")
    expect(Number(declarations(focus)["z-index"])).toBeGreaterThan(
      Number(shared?.["z-index"])
    )
    viewport.walkDecls((declaration) => {
      expect(declaration.prop).not.toMatch(CLIPPING_OR_MOTION)
    })
  })

  it("leaves other themes' fallback cue invisible and their unavailable surface unchanged", () => {
    const values = tokens()
    expect(values["--color-tabs-overflow"]).toBe("var(--color-transparent)")
    expect(values["--color-tabs-overflow-bg-cue"]).toBe(
      "var(--color-tabs-overflow)"
    )
    expect(values["--color-tabs-overflow-bg-cover"]).toBe(
      "var(--color-tabs-list-bg)"
    )
    expect(values["--color-tabs-unavailable"]).toBe(
      "var(--color-button-bg-disabled)"
    )
    expect(values["--color-tabs-trigger-bg-disabled"]).toBe(
      "var(--color-tabs-unavailable)"
    )
  })

  it("lets the Tabs unavailable alias win over inherited Button paint without enabling the tab", () => {
    const disabled = renderTabs().match(DISABLED_TAB_TAG)?.[0]
    expect(disabled).toContain("tabs-trigger-disabled")
    expect(disabled).toMatch(DISABLED_ATTRIBUTE)
    expect(disabled).toContain('aria-disabled="true"')
    expect(disabled).toContain('aria-selected="false"')
    const unavailable = utility("tabs-trigger-disabled")
    const rules = unavailable.nodes?.filter(
      (node): node is Rule => node.type === "rule"
    )
    expect(rules).toHaveLength(1)
    const rule = rules?.[0] as Rule
    // Four attributes/classes outrank Button's three, including hover/active.
    expect(rule.selector).toContain(
      '&[data-scope="tabs"][data-part="trigger"][data-disabled]'
    )
    expect(rule.selector).toContain(":is(:hover, :active)")
    expect(declarations(rule)).toEqual({
      "background-color": "var(--color-tabs-trigger-bg-disabled)",
    })
  })
})
