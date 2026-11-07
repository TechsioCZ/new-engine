import { createElement as h } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Rating } from "../src/atoms/rating"

const FRACTION = /<span\b[^>]*data-part="fractional-glyph"[^>]*>/
const INPUT = /<input\b[^>]*>/
const RADIO = /<span\b[^>]*role="radio"[^>]*>/g

const preciseScores = [
  [0.001, 99.9],
  [4.625, 37.5],
  [4.999, 0.1],
  [4.6, 40],
] as const

describe("Rating fractional presentation", () => {
  describe.each(["ltr", "rtl"] as const)("%s direction", (dir) => {
    it.each(preciseScores)(
      "keeps aggregate %s and its %s%% clip in agreement",
      (value, clip) => {
        const html = renderToStaticMarkup(
          h(Rating, {
            displayOnly: true,
            value,
            dir,
            labelText: "Average product rating",
            name: "aggregate-score",
          })
        )
        const fraction = html.match(FRACTION)?.[0]

        expect(fraction).toContain(`--rating-item-clip:${clip}%`)
        expect(fraction).toContain(`dir="${dir}"`)
        expect(fraction).toContain('aria-hidden="true"')
        expect(html).toContain(`<bdi dir="ltr">${value} / 5</bdi>`)
        expect(html).toContain(
          `aria-label="Average product rating: ${value} out of 5"`
        )
        expect(html).not.toMatch(INPUT)
        expect(html).not.toContain('role="radio"')
        expect(html).not.toContain("tabindex=")
      }
    )

    it.each(preciseScores)(
      "keeps saved form score %s exact without changing radio semantics",
      (value, clip) => {
        const html = renderToStaticMarkup(
          h(Rating, {
            readOnly: true,
            value,
            dir,
            name: "saved-score",
            labelText: "Your delivery rating",
          })
        )
        const input = html.match(INPUT)?.[0]
        const radios = [...html.matchAll(RADIO)].map((match) => match[0])
        const selected = radios[Math.ceil(value) - 1]

        expect(input).toContain('name="saved-score"')
        expect(input).toContain(`value="${value}"`)
        expect(html.match(FRACTION)?.[0]).toContain(
          `--rating-item-clip:${clip}%`
        )
        expect(html.match(FRACTION)?.[0]).toContain(`dir="${dir}"`)
        expect(html).toContain(`<bdi dir="ltr">${value} / 5</bdi>`)
        expect(radios).toHaveLength(5)
        expect(
          radios.filter((radio) => radio.includes('tabindex="0"'))
        ).toHaveLength(1)
        expect(selected).toContain('aria-checked="true"')
        expect(selected).toContain('tabindex="0"')
        expect(selected).toContain(`aria-label="${value} stars"`)
        expect(selected).toContain("focus-visible:rating-focus-outline")
      }
    )

    it("leaves editable half-star rendering with the rating machine", () => {
      const html = renderToStaticMarkup(
        h(Rating, { value: 4.5, allowHalf: true, dir, name: "score" })
      )

      expect(html).not.toMatch(FRACTION)
      expect(html).toContain('data-half=""')
      expect(html.match(INPUT)?.[0]).toContain('value="4.5"')
      expect(html).toContain("rtl:data-half:-scale-x-100")
    })
  })
})
