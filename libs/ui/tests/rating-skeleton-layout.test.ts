import { readFileSync } from "node:fs"
import postcss from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Rating } from "../src/atoms/rating"
import { Skeleton } from "../src/atoms/skeleton"

const CONTROL = /<div\b[^>]*role="(?:radiogroup|img)"[^>]*>/
const ITEM_CLASS = /<span\b[^>]*class="([^"]*rating-item-fluid[^"]*)"/g

function declarations(file: string, selector: string) {
  const values = new Map<string, string>()
  postcss
    .parse(readFileSync(new URL(file, import.meta.url), "utf8"))
    .walkRules((rule) => {
      if (rule.selector === selector) {
        rule.walkDecls((decl) => {
          values.set(decl.prop, decl.value)
        })
      }
    })
  return values
}

function atRuleDeclarations(file: string, name: string, params: string) {
  const values = new Map<string, string>()
  postcss
    .parse(readFileSync(new URL(file, import.meta.url), "utf8"))
    .walkAtRules(name, (rule) => {
      if (rule.params === params) {
        rule.walkDecls((decl) => {
          values.set(decl.prop, decl.value)
        })
      }
    })
  return values
}

describe("rating layout", () => {
  it("gives every star a fluid, size-aware target", () => {
    const html = renderToStaticMarkup(
      h(Rating, { count: 10, defaultValue: 7, size: "lg", allowHalf: false })
    )
    const items = [...html.matchAll(ITEM_CLASS)].map((match) => match[1])
    expect(items).toHaveLength(10)
    for (const item of items) {
      expect(item).toContain("text-rating-lg")
      expect(item).not.toContain("shrink-0")
      expect(item).not.toContain("min-w-rating-target")
    }
  })

  it("compresses toward the minimum target without dropping below the glyph", () => {
    const fluid = atRuleDeclarations(
      "../src/tokens/components/atoms/_rating.css",
      "utility",
      "rating-item-fluid"
    )
    expect(fluid.get("flex")).toBe(
      "1 1 max(var(--spacing-rating-target-min), 1em)"
    )
    expect(fluid.get("width")).toBe("var(--spacing-rating-target)")
    expect(fluid.get("max-width")).toBe("var(--spacing-rating-target)")
    expect(fluid.get("min-width")).toBe(
      "max(var(--spacing-rating-target-min), 1em)"
    )
  })

  it("keeps the read-only field surface off display-only aggregates", () => {
    const display = renderToStaticMarkup(
      h(Rating, { value: 4.6, displayOnly: true })
    ).match(CONTROL)?.[0]
    const readOnly = renderToStaticMarkup(
      h(Rating, { value: 4.6, readOnly: true })
    ).match(CONTROL)?.[0]
    expect(display).not.toContain("data-readonly")
    expect(readOnly).toContain('data-readonly=""')
  })
})

describe("skeleton rectangle", () => {
  it("rounds through an overridable component-layer token", () => {
    const html = renderToStaticMarkup(
      h(Skeleton.Rectangle, { className: "rounded-lg h-20" })
    )
    expect(html).toContain("skeleton-rectangle")
    expect(html).toContain("rounded-lg")
    expect(
      declarations(
        "../src/tokens/components/atoms/_skeleton.css",
        ".skeleton-rectangle"
      ).get("border-radius")
    ).toBe("var(--radius-skeleton-rectangle)")
  })

  it("defaults the rectangle radius to square outside opted-in themes", () => {
    expect(
      atRuleDeclarations(
        "../src/tokens/components/atoms/_skeleton.css",
        "theme",
        "static"
      ).get("--radius-skeleton-rectangle")
    ).toBe("var(--radius-none)")
  })
})
