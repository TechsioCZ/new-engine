import { describe, expect, it } from "vitest"
import {
  buildContentSearchDocument,
  readCanonicalPublicHref,
} from "../documents"

describe("content search documents", () => {
  it("uses a stable source ID and URLR-projected canonical href", () => {
    expect(
      buildContentSearchDocument(
        {
          content: "<p>Trusted content</p>",
          id: 42,
          slug: "payload-editorial-slug",
          title: "Article",
        },
        "article",
        "sk-SK",
        "/blog/urlr-canonical-slug"
      )
    ).toMatchObject({
      href: "/blog/urlr-canonical-slug",
      id: "article_42",
      source_id: "42",
      type: "article",
    })
  })

  it.each([
    undefined,
    "",
    " /blog/article",
    "https://attacker.example/blog/article",
    "//attacker.example/article",
    "/~sf/sk/advice/article",
    "/api/content/article",
    "/blog/article?preview=true",
    "/blog/article#draft",
    "/blog/../article",
    "/blog/article/",
  ])("fails closed for a non-canonical public href %s", (publicHref) => {
    expect(
      buildContentSearchDocument(
        { id: "article_1", slug: "must-not-be-used" },
        "article",
        "sk-SK",
        publicHref
      )
    ).toBeUndefined()
  })

  it("fails closed when the stable source ID is missing", () => {
    expect(
      buildContentSearchDocument(
        { slug: "must-not-be-used" },
        "page",
        "cs-CZ",
        "/informace/kontakt"
      )
    ).toBeUndefined()
  })

  it("does not trust a CMS-owned public_href field as a URLR projection", () => {
    expect(
      buildContentSearchDocument(
        {
          id: "article_1",
          public_href: "/blog/cms-controlled",
          slug: "cms-controlled",
        },
        "article",
        "sk-SK",
        undefined
      )
    ).toBeUndefined()
  })

  it.each([
    "/blog/article",
    "/informace/kontakt",
    "/",
  ])("accepts a public path %s", (href) => {
    expect(readCanonicalPublicHref(href)).toBe(href)
  })
})
