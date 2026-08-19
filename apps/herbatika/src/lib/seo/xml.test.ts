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
      { location: "https://herbatica.cz/produkty/example" },
    ])
    expect(urlSet).not.toContain("<lastmod>")
    expect(urlSet).toContain("<urlset")
  })
})
