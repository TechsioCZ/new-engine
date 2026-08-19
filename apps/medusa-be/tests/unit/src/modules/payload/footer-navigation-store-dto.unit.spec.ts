import { describe, expect, it } from "vitest"
import { toCmsStoreFooterNavigation } from "../../../../../src/modules/payload/footer-navigation-store-dto"

describe("toCmsStoreFooterNavigation", () => {
  it("maps CMS pages, app routes, and external links", () => {
    const result = toCmsStoreFooterNavigation({
      columns: [
        {
          slot: "information",
          items: [
            {
              blockType: "cmsPageLink",
              slot: "about",
              page: {
                id: 1,
                slug: "/o-nas/",
                title: "O nás",
                status: "published",
                visibility: "public",
              },
            },
            {
              blockType: "appRouteLink",
              slot: "blog",
              path: "/blog",
            },
            {
              blockType: "externalLink",
              slot: "reviews",
              url: "https://example.com/reviews",
              newTab: false,
            },
          ],
        },
      ],
    })

    expect(result).toEqual({
      columns: [
        {
          slot: "information",
          items: [
            { slot: "about", href: "/o-nas", type: "internal" },
            { slot: "blog", href: "/blog", type: "internal" },
            {
              slot: "reviews",
              href: "https://example.com/reviews",
              type: "external",
              newTab: false,
            },
          ],
        },
      ],
    })
  })

  it("drops unavailable CMS relationships and resulting empty columns", () => {
    const result = toCmsStoreFooterNavigation({
      columns: [
        {
          slot: "important",
          items: [
            {
              blockType: "cmsPageLink",
              slot: "terms",
              page: {
                id: 1,
                slug: "terms",
                status: "draft",
                visibility: "public",
              },
            },
            {
              blockType: "cmsPageLink",
              slot: "privacy",
              page: {
                id: 2,
                slug: null,
                status: "published",
                visibility: "public",
              },
            },
            {
              blockType: "cmsPageLink",
              slot: "cookies",
              page: 3,
            },
          ],
        },
      ],
    })

    expect(result).toEqual({ columns: [] })
  })
})
