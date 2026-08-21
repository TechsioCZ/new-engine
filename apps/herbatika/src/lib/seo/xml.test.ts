import { describe, expect, it } from "vitest"
import { escapeXml, serializeSitemapIndex, serializeUrlSet } from "./xml"

describe("SEO XML serialization", () => {
  it("escapes markup and removes XML 1.0 control characters", () => {
    expect(escapeXml(`<&>"'\u0001`)).toBe("&lt;&amp;&gt;&quot;&apos;")
  })

  it("serializes sitemap documents without generation-time lastmod", () => {
    expect(
      serializeSitemapIndex([
        {
          lastModified: "2026-08-19T10:00:00.000Z",
          location: "https://herbatica.cz/sitemaps/product-1.xml?a=1&b=2",
        },
      ])
    ).toContain("https://herbatica.cz/sitemaps/product-1.xml?a=1&amp;b=2")
    const urlSet = serializeUrlSet([
      {
        alternates: {
          "cs-CZ": "https://herbatica.cz/produkty/example?a=1&b=2",
          "sk-SK": "https://herbatica.sk/produkty/example-sk",
        },
        location: "https://herbatica.cz/produkty/example",
      },
    ])
    expect(urlSet).not.toContain("<lastmod>")
    expect(urlSet).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">'
    )
    expect(urlSet).toContain(
      '<xhtml:link rel="alternate" hreflang="cs-CZ" href="https://herbatica.cz/produkty/example?a=1&amp;b=2"/>'
    )
    expect(urlSet).toContain(
      '<xhtml:link rel="alternate" hreflang="sk-SK" href="https://herbatica.sk/produkty/example-sk"/>'
    )
    expect(urlSet.indexOf("<loc>")).toBeLessThan(urlSet.indexOf("<xhtml:link"))
  })
})
