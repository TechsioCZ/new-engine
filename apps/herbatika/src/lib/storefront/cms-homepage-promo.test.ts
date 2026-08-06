import { describe, expect, it, vi } from "vitest"
import type { CmsPage } from "./cms-types"

vi.mock("./cms-client", () => ({
  resolveCmsMediaUrl: () => null,
}))
vi.mock("./cms-pages", () => ({
  fetchCmsPageBySlug: vi.fn(),
}))

import { mapCmsPageToHomepagePromo } from "./cms-homepage-promo"

const UNSAFE_HTML_PATTERN =
  /<script|<style|onclick|onmouseover|style=|javascript:/i

const cmsPage = (content: string): CmsPage => ({
  content,
  id: "homepage-promo",
  title: "Homepage promo",
})

describe("mapCmsPageToHomepagePromo", () => {
  it("removes executable CMS markup while retaining safe formatting", () => {
    const promo = mapCmsPageToHomepagePromo(
      cmsPage(`
        <style>.promo { color: red; }</style>
        <script>alert("xss")</script>
        <p onclick="alert('event')" style="color: red">
          <strong>Safe</strong> <em>formatting</em>
          <a href="javascript:alert('url')">unsafe link</a>
          <a href="/safe" onmouseover="alert('event')">safe link</a>
        </p>
      `)
    )

    expect(promo?.contentHtml).toContain("<strong>Safe</strong>")
    expect(promo?.contentHtml).toContain("<em>formatting</em>")
    expect(promo?.contentHtml).toContain('<a href="/safe">safe link</a>')
    expect(promo?.contentHtml).not.toMatch(UNSAFE_HTML_PATTERN)
    expect(promo?.contentHtml).not.toContain("alert")
  })

  it("falls back when sanitization removes all CMS content", () => {
    expect(
      mapCmsPageToHomepagePromo(
        cmsPage("<script>alert('xss')</script><style>p { color: red; }</style>")
      )
    ).toBeNull()
  })
})
