import { readFileSync } from "node:fs"
import postcss, { type AtRule, type Declaration, type Rule } from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Steps } from "../src/molecules/steps"

const SELECTOR_WHITESPACE = /\s+/g
const LIST_TAG = /<ol\b[^>]*>/
const DESCRIPTION_TAG = /<span\b[^>]*data-part="description"[^>]*>/g
const MEDIUM_FALLBACK =
  /var\(\s*--steps-connector-indicator-size,\s*var\(--size-steps-indicator-md\)\s*\)/

const css = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/molecules/_steps.css", import.meta.url),
    "utf8"
  )
)

function utility(name: string) {
  const node = css.nodes.find(
    (entry): entry is AtRule =>
      entry.type === "atrule" &&
      entry.name === "utility" &&
      entry.params === name
  )
  if (!node) {
    throw new Error(`Missing Steps utility: ${name}`)
  }
  return node
}

function childRule(parent: AtRule | Rule, selector: string) {
  const node = parent.nodes?.find(
    (entry): entry is Rule =>
      entry.type === "rule" &&
      entry.selector.replaceAll(SELECTOR_WHITESPACE, "") ===
        selector.replaceAll(SELECTOR_WHITESPACE, "")
  )
  if (!node) {
    throw new Error(`Missing Steps selector: ${selector}`)
  }
  return node
}

function declarations(rule: Rule) {
  return Object.fromEntries(
    rule.nodes
      .filter((node): node is Declaration => node.type === "decl")
      .map((node) => [node.prop, node.value])
  )
}

function renderMixedSteps({
  describedIndex = 0,
  dir = "ltr",
  orientation = "horizontal",
  indicators = true,
}: {
  describedIndex?: number
  dir?: "ltr" | "rtl"
  orientation?: "horizontal" | "vertical"
  indicators?: boolean
} = {}) {
  return renderToStaticMarkup(
    h(
      Steps,
      { count: 3, dir, orientation },
      h(
        Steps.List,
        null,
        ...["Brief", "Go", "Done"].map((title, index) =>
          h(
            Steps.Item,
            { index, key: title },
            h(
              Steps.Trigger,
              null,
              indicators ? h(Steps.Indicator) : null,
              h(
                Steps.ItemText,
                null,
                h(Steps.Title, null, title),
                index === describedIndex
                  ? h(Steps.Description, null, "Define scope and ownership.")
                  : null
              )
            ),
            h(Steps.Separator)
          )
        )
      )
    )
  )
}

// Source/SSR contracts only; the story play and browser spec verify real geometry.
describe("Steps mixed-description connector layout", () => {
  it.each([0, 1, 2])(
    "wires the list and a single real description at index %i without consumer markers",
    (describedIndex) => {
      for (const dir of ["ltr", "rtl"] as const) {
        const html = renderMixedSteps({ describedIndex, dir })
        expect(html.match(LIST_TAG)?.[0]).toContain(
          "steps-description-connectors"
        )
        expect(html.match(DESCRIPTION_TAG)).toHaveLength(1)
        expect(html.match(DESCRIPTION_TAG)?.[0]).toContain('data-scope="steps"')
        expect(html).toContain(`dir="${dir}"`)
      }
    }
  )

  it("selects all indicator items from a horizontal list with any description, on mobile only", () => {
    const layout = utility("steps-description-connectors")
    expect(layout.nodes).toHaveLength(1)
    const mobile = layout.nodes?.[0]
    if (mobile?.type !== "atrule") {
      throw new Error("Missing Steps mobile variant")
    }
    expect(mobile.type).toBe("atrule")
    expect(mobile.name).toBe("variant")
    expect(mobile.params).toBe("max-sm")
    const list = childRule(
      mobile,
      '&[data-orientation="horizontal"]:has(> [data-part="item"] [data-part="description"])'
    )
    const item = childRule(
      list,
      '& > [data-part="item"]:has([data-part="indicator"])'
    )
    expect(declarations(childRule(item, '& > [data-part="trigger"]'))).toEqual({
      "inline-size": "100%",
    })
    const separator = declarations(
      childRule(item, '& > [data-part="separator"]')
    )
    expect(separator.position).toBe("absolute")
    expect(separator["inset-block-start"]).toBe("0")
    expect(separator["inset-inline-start"]).toMatch(MEDIUM_FALLBACK)
    expect(separator["inline-size"]).toMatch(MEDIUM_FALLBACK)
    expect(separator["inline-size"]).toContain("var(--spacing-steps-list)")
    expect(separator).not.toHaveProperty("left")
    expect(separator).not.toHaveProperty("right")
    expect(separator).not.toHaveProperty("display")
    expect(separator).not.toHaveProperty("visibility")
    expect(separator).not.toHaveProperty("opacity")
    // Both old and new geometry must resolve when a size utility is absent.
    utility("steps-indicator-connectors").walkDecls(
      "margin-block-start",
      (declaration) => expect(declaration.value).toMatch(MEDIUM_FALLBACK)
    )
    expect(utility("steps-indicator-connectors").toString()).not.toContain(
      ':has([data-part="description"])'
    )
  })

  it("preserves vertical and indicator-free compositions without changing the public props", () => {
    expect(renderMixedSteps({ orientation: "vertical" })).toContain(
      'data-orientation="vertical"'
    )
    const lines = renderMixedSteps({ indicators: false })
    expect(lines).toContain('data-part="description"')
    expect(lines).not.toContain('data-part="indicator"')
    expect(lines).toContain('data-part="separator"')
  })
})
