import { describe, expect, it } from "vitest"

import { sanitizeHomepagePromoHtml } from "./homepage-promo-html"

describe(sanitizeHomepagePromoHtml, () => {
  it("preserves the rich-text formatting enabled for Payload pages", () => {
    const html = `
      <h1>Heading 1</h1><h5>Heading 5</h5><h6>Heading 6</h6>
      <p><code>code</code> H<sub>2</sub>O x<sup>2</sup></p>
      <p><span style="text-decoration: line-through;">removed</span></p>
      <p><span style="text-decoration: underline;">important</span></p>
      <hr />
      <ul class="list-check">
        <li aria-checked="true" class="list-item-checkbox" role="checkbox">
          <input checked type="checkbox" /><label>Done</label>
        </li>
      </ul>
    `

    const result = sanitizeHomepagePromoHtml(html)

    const expectedFragments = [
      "<h1>Heading 1</h1>",
      "<h5>Heading 5</h5>",
      "<h6>Heading 6</h6>",
      "<code>code</code>",
      "H<sub>2</sub>O x<sup>2</sup>",
      '<span style="text-decoration: line-through;">removed</span>',
      '<span style="text-decoration: underline;">important</span>',
      "<hr>",
      '<li aria-checked="true" role="checkbox">',
    ]
    const rejectedFragments = ["<input", "<label"]

    for (const fragment of expectedFragments) {
      expect(result).toContain(fragment)
    }
    for (const fragment of rejectedFragments) {
      expect(result).not.toContain(fragment)
    }
  })

  it("rejects attributes and style values outside the promo policy", () => {
    const result = sanitizeHomepagePromoHtml(`
      <h1 onclick="alert(1)">Heading</h1>
      <span style="background-image: url(javascript:alert(1))">Text</span>
      <li aria-checked="invalid" role="button">Item</li>
      <script>alert(1)</script>
    `)

    expect(result).toBe(
      "<h1>Heading</h1>\n      <span>Text</span>\n      <li>Item</li>",
    )
  })
})
