import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/head", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

import { SeoHead } from "./head"

const ROBOTS_META_PATTERN =
  /<meta[^>]+content="index, follow"[^>]+name="robots"/
const CANONICAL_LINK_PATTERN =
  /<link[^>]+href="https:\/\/herbatica\.sk\/produkty\/caj"[^>]+rel="canonical"/

describe("SeoHead", () => {
  it("renders the serializable model through Pages Router tags", () => {
    const html = renderToStaticMarkup(
      <SeoHead
        metadata={{
          title: "Tea",
          description: "Herbal tea",
          robots: "index, follow",
          canonical: "https://herbatica.sk/produkty/caj",
          hreflang: [
            {
              hrefLang: "sk-SK",
              href: "https://herbatica.sk/produkty/caj",
            },
          ],
          openGraph: {
            url: "https://herbatica.sk/produkty/caj",
            title: "Tea",
            description: "Herbal tea",
            type: "product",
          },
        }}
      />
    )

    expect(html).toContain("<title>Tea</title>")
    expect(html).toMatch(ROBOTS_META_PATTERN)
    expect(html).toMatch(CANONICAL_LINK_PATTERN)
    expect(html).toContain('hrefLang="sk-SK"')
    expect(html).toContain('property="og:url"')
    expect(html).toContain('property="og:type"')
  })

  it("does not render absent noindex URL signals", () => {
    const html = renderToStaticMarkup(
      <SeoHead metadata={{ robots: "noindex, follow" }} />
    )
    expect(html).toContain('content="noindex, follow"')
    expect(html).not.toContain("canonical")
    expect(html).not.toContain("alternate")
    expect(html).not.toContain("og:url")
  })
})
