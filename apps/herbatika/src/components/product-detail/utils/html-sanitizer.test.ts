import { describe, expect, it } from "vitest"
import { sanitizeBlogHtml, sanitizeHtml } from "./html-sanitizer"

describe("sanitizeBlogHtml", () => {
  it("keeps supported Lexical markup without widening the default profile", () => {
    const html =
      '<h1 style="text-align: center; color: red">Title</h1><code>value</code>'

    expect(sanitizeHtml(html)).toBe("Titlevalue")
    expect(sanitizeBlogHtml(html)).toBe(
      '<h1 style="text-align: center">Title</h1><code>value</code>'
    )
  })

  it("removes unsupported responsive wrappers and keeps their image", () => {
    const html =
      '<picture><source srcset="https://cdn.example.com/a.webp 1x, javascript:alert(1) 2x" type="image/webp"><img src="https://cdn.example.com/a.jpg" alt="A"></picture>'

    expect(sanitizeBlogHtml(html)).toBe(
      '<img alt="A" src="https://cdn.example.com/a.jpg" loading="lazy" decoding="async">'
    )
  })

  it("renders imported checkboxes as disabled controls", () => {
    expect(
      sanitizeBlogHtml('<input type="checkbox" checked onclick="alert(1)">Done')
    ).toBe('<input type="checkbox" checked disabled>Done')
  })

  it("keeps safe heading anchors for the generated table of contents", () => {
    expect(
      sanitizeBlogHtml(
        '<h2 id="co-su-elektrolyty" onclick="alert(1)">Nadpis</h2><h2 id="bad id">Ďalší</h2>'
      )
    ).toBe('<h2 id="co-su-elektrolyty">Nadpis</h2><h2>Ďalší</h2>')
  })
})
