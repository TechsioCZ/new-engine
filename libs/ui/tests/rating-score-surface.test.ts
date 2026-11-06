import { readFileSync } from "node:fs"
import postcss from "postcss"
import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Rating } from "../src/atoms/rating"

const ROOT = /^<div\b[^>]*>/
const CONTROL = /<div\b[^>]*role="(?:radiogroup|img)"[^>]*>/
const RADIO = /<span\b[^>]*role="radio"[^>]*>/g
const INPUT = /<input\b[^>]*>/
const FRACTION = /<span\b[^>]*data-part="fractional-glyph"[^>]*>/
const SCORE =
  /<span\b[^>]*class="[^"]*text-rating-value[^"]*"[^>]*>(.*?)<\/span>/

const ratingCss = postcss.parse(
  readFileSync(
    new URL("../src/tokens/components/atoms/_rating.css", import.meta.url),
    "utf8"
  )
)

function utilityDeclarations(name: string) {
  const declarations = new Map<string, string>()
  ratingCss.walkAtRules("utility", (rule) => {
    if (rule.params === name) {
      rule.walkDecls((declaration) => {
        declarations.set(declaration.prop, declaration.value)
      })
    }
  })
  return declarations
}

describe("Rating score direction and saved surface", () => {
  it.each(["ltr", "rtl"] as const)(
    "isolates value / count without changing the %s aggregate direction or fraction",
    (dir) => {
      const html = renderToStaticMarkup(
        h(Rating, {
          dir,
          displayOnly: true,
          value: 4.6,
          labelText: "Average product rating",
          name: "aggregate-score",
        })
      )
      expect(html.match(ROOT)?.[0]).toContain(`dir="${dir}"`)
      expect(html.match(SCORE)?.[1]).toBe('<bdi dir="ltr">4.6 / 5</bdi>')
      expect(html.match(FRACTION)?.[0]).toContain(`dir="${dir}"`)
      expect(html.match(FRACTION)?.[0]).toContain("--rating-item-clip:40%")
      expect(html.match(CONTROL)?.[0]).toContain(
        'aria-label="Average product rating: 4.6 out of 5"'
      )
      expect(html.match(CONTROL)?.[0]).not.toContain("data-readonly")
      expect(html).not.toMatch(INPUT)
      expect(html).not.toContain('role="radio"')
      expect(html).not.toContain("tabindex=")
    }
  )

  it.each([
    [0.1, 90, 1],
    [4.6, 40, 5],
  ])(
    "preserves the exact saved %s and selected tab stop",
    (value, clip, selected) => {
      const html = renderToStaticMarkup(
        h(Rating, {
          dir: "rtl",
          readOnly: true,
          value,
          name: "saved-score",
          labelText: "Your delivery rating",
          helpText: "Your review is already published.",
        })
      )
      const control = html.match(CONTROL)?.[0]
      const radios = [...html.matchAll(RADIO)].map((match) => match[0])
      expect(control).toContain('data-readonly=""')
      expect(control).toContain("rating-readonly")
      expect(control).toContain("form-control-readonly")
      expect(html.match(INPUT)?.[0]).toContain('name="saved-score"')
      expect(html.match(INPUT)?.[0]).toContain(`value="${value}"`)
      expect(html.match(SCORE)?.[1]).toBe(`<bdi dir="ltr">${value} / 5</bdi>`)
      expect(html.match(FRACTION)?.[0]).toContain(`--rating-item-clip:${clip}%`)
      expect(radios).toHaveLength(5)
      expect(
        radios.filter((radio) => radio.includes('tabindex="0"'))
      ).toHaveLength(1)
      for (const [index, radio] of radios.entries()) {
        expect(radio).toContain(`aria-posinset="${index + 1}"`)
        expect(radio).toContain('data-readonly=""')
        expect(radio).toContain("focus-visible:rating-focus-outline")
        expect(radio).toContain(`tabindex="${index + 1 === selected ? 0 : -1}"`)
      }
      expect(radios[selected - 1]).toContain('aria-checked="true"')
      expect(radios[selected - 1]).toContain(`aria-label="${value} stars"`)
      expect(html).toContain("Your review is already published.")
    }
  )

  it("routes only Rating's readonly paint through an overridable transparent alias", () => {
    const tokens = new Map<string, string>()
    ratingCss.walkAtRules("theme", (rule) => {
      rule.walkDecls((declaration) => {
        tokens.set(declaration.prop, declaration.value)
      })
    })
    expect(tokens.get("--color-rating-readonly")).toBe(
      "var(--color-transparent)"
    )
    expect(tokens.get("--color-rating-bg-readonly")).toBe(
      "var(--color-rating-readonly)"
    )
    expect([...utilityDeclarations("rating-readonly")]).toEqual([
      ["--color-form-control-bg-readonly", "var(--color-rating-bg-readonly)"],
    ])
  })

  it("retains the visible outline and directional SVG clipping", () => {
    const focus = utilityDeclarations("rating-focus-outline")
    expect(focus.get("outline")).toBe(
      "var(--default-ring-width) var(--default-ring-style)\n    var(--color-rating-ring)"
    )
    expect(focus.get("outline-offset")).toBe("var(--default-ring-offset)")
    const clips: string[] = []
    ratingCss.walkAtRules("utility", (rule) => {
      if (rule.params === "rating-fractional-fill") {
        rule.walkDecls("clip-path", (declaration) => {
          clips.push(declaration.value)
        })
      }
    })
    expect(clips).toEqual([
      "inset(0 var(--rating-item-clip, 0%) 0 0)",
      "inset(0 0 0 var(--rating-item-clip, 0%))",
    ])
  })
})
