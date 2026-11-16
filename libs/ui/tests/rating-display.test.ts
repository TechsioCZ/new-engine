import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Rating } from "../src/atoms/rating"

const FRACTIONAL_GLYPH = /<span\b[^>]*data-part="fractional-glyph"[^>]*>/
const FORM_INPUT = /<input\b[^>]*>/

describe("precise read-only ratings", () => {
  it.each([
    [4.2, 80],
    [4.5, 50],
    [4.6, 40],
    [4.8, 20],
    [0.1, 90],
  ])("renders %s with a matching fractional star", (value, clip) => {
    const html = renderToStaticMarkup(
      h(Rating, { value, displayOnly: true, labelText: "Average" })
    )
    const fraction = html.match(FRACTIONAL_GLYPH)?.[0]
    expect(fraction).toContain(`--rating-item-clip:${clip}%`)
    expect(fraction).toContain('aria-hidden="true"')
    expect(fraction).toContain("rating-fractional-fill")
    expect(html).toContain(`aria-label="Average: ${value} out of 5"`)
    expect(html).not.toContain('role="radio"')
    expect(html).not.toContain("<input")
  })

  it.each([0, 4, 5])("does not add a fractional star for %s", (value) => {
    const html = renderToStaticMarkup(h(Rating, { value, displayOnly: true }))
    expect(html).not.toMatch(FRACTIONAL_GLYPH)
  })

  it("preserves read-only form values and direction", () => {
    const html = renderToStaticMarkup(
      h(Rating, { value: 4.6, readOnly: true, name: "score", dir: "rtl" })
    )
    expect(html.match(FORM_INPUT)?.[0]).toContain('value="4.6"')
    expect(html.match(FORM_INPUT)?.[0]).toContain('name="score"')
    expect(html).toContain('dir="rtl"')
    expect(html.match(FRACTIONAL_GLYPH)?.[0]).toContain(
      "--rating-item-clip:40%"
    )
    expect(html.match(FRACTIONAL_GLYPH)?.[0]).toContain('dir="rtl"')
    expect(html).toContain('role="radio"')
  })

  it("leaves editable half-star rendering to the existing state machine", () => {
    const html = renderToStaticMarkup(
      h(Rating, { value: 4.5, name: "score", allowHalf: true })
    )
    expect(html).not.toMatch(FRACTIONAL_GLYPH)
    expect(html).toContain('data-half=""')
    expect(html.match(FORM_INPUT)?.[0]).toContain('value="4.5"')
  })
})
