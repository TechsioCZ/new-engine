import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { sanitizeBlogHtml, sanitizeHtml } from "./html-sanitizer"

describe("sanitizeBlogHtml", () => {
  it("keeps supported Lexical markup without widening the default profile", () => {
    const html =
      '<h1 style="text-align: center; color: red">Title</h1><code>value</code>'

    assert.equal(sanitizeHtml(html), "Titlevalue")
    assert.equal(
      sanitizeBlogHtml(html),
      '<h1 style="text-align: center">Title</h1><code>value</code>'
    )
  })

  it("removes unsupported responsive wrappers and keeps their image", () => {
    const html =
      '<picture><source srcset="https://cdn.example.com/a.webp 1x, javascript:alert(1) 2x" type="image/webp"><img src="https://cdn.example.com/a.jpg" alt="A"></picture>'

    assert.equal(
      sanitizeBlogHtml(html),
      '<img alt="A" src="https://cdn.example.com/a.jpg" loading="lazy" decoding="async">'
    )
  })

  it("renders imported checkboxes as disabled controls", () => {
    assert.equal(
      sanitizeBlogHtml(
        '<input type="checkbox" checked onclick="alert(1)">Done'
      ),
      '<input type="checkbox" checked disabled>Done'
    )
  })

  it("keeps safe heading anchors for the generated table of contents", () => {
    assert.equal(
      sanitizeBlogHtml(
        '<h2 id="co-su-elektrolyty" onclick="alert(1)">Nadpis</h2><h2 id="bad id">Ďalší</h2>'
      ),
      '<h2 id="co-su-elektrolyty">Nadpis</h2><h2>Ďalší</h2>'
    )
  })
})
