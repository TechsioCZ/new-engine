import { describe, expect, it } from "vitest"

import {
  hasRenderableHtmlContent,
  sanitizeHtml,
  stripHtml,
} from "@/components/product-detail/utils/html-sanitizer"

describe(sanitizeHtml, () => {
  it("removes executable and embedded content", () => {
    const html = [
      "<script>alert(1)</script>",
      "<style>body{display:none}</style>",
      "<iframe>frame</iframe>",
      "<object>object</object>",
      "<embed>embed</embed>",
      "<p>safe</p>",
    ].join("")

    expect(sanitizeHtml(html)).toBe("<p>safe</p>")
  })

  it("drops event handlers and unsafe URL protocols", () => {
    expect(
      sanitizeHtml(
        '<a href="javascript:alert(1)" onclick="alert(1)">link</a><img src="data:image/svg+xml,x" onerror="alert(1)">',
      ),
    ).toBe("<a>link</a>")
  })

  it("hardens external links and escapes retained attributes", () => {
    expect(
      sanitizeHtml(
        '<a href="https://example.com?a=1&b=2" target="same" rel="author" title="a<b">link</a>',
      ),
    ).toBe(
      '<a title="a&lt;b" href="https://example.com?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">link</a>',
    )
  })

  it("preserves safe local link attributes", () => {
    expect(
      sanitizeHtml('<a href="/products" target="same" rel="author">link</a>'),
    ).toBe('<a href="/products" target="same" rel="author">link</a>')
  })

  it("requires a safe image source and supplies loading defaults", () => {
    expect(sanitizeHtml('<img alt="Herb" src="/herb.jpg">')).toBe(
      '<img alt="Herb" src="/herb.jpg" loading="lazy" decoding="async">',
    )
    expect(sanitizeHtml('<img alt="missing">')).toBe("")
  })

  it("retains valid image loading and decoding values", () => {
    expect(
      sanitizeHtml(
        '<img src="https://example.com/a.jpg" loading="eager" decoding="sync">',
      ),
    ).toBe('<img src="https://example.com/a.jpg">')
  })

  it("only permits configured extension attributes with exact values", () => {
    const options = {
      additionalAllowedAttributeValues: {
        mark: { role: new Set(["note"]) },
      },
      additionalAllowedTagAttributes: { mark: new Set(["role"]) },
      additionalAllowedTags: new Set(["mark"]),
    }

    expect(
      sanitizeHtml(
        '<mark role="note">yes</mark><mark role="alert">no</mark>',
        options,
      ),
    ).toBe('<mark role="note">yes</mark><mark>no</mark>')
  })

  it("does not widen ASCII tag matching through Unicode case folding", () => {
    expect(sanitizeHtml("<ſcript>kept text</ſcript>")).toBe(
      "<ſcript>kept text</ſcript>",
    )
  })
})

describe("HTML content helpers", () => {
  it("strips tags, executable content, entities, and excess whitespace", () => {
    expect(stripHtml(" <p>A&nbsp; B</p><script>bad</script> C ")).toBe("A B C")
  })

  it("recognizes text and safe images as renderable", () => {
    expect(hasRenderableHtmlContent("<p>Text</p>")).toBeTruthy()
    expect(hasRenderableHtmlContent('<img src="/herb.jpg">')).toBeTruthy()
    expect(hasRenderableHtmlContent("<script>bad</script>")).toBeFalsy()
    expect(
      hasRenderableHtmlContent('<img src="data:image/svg+xml,x">'),
    ).toBeFalsy()
  })
})
