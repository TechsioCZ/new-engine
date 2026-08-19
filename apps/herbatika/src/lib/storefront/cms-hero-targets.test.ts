import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  type CmsHeroBannerItem,
  mapCmsHeroCarouselToHeroBanner,
} from "./cms-hero-carousels"
import {
  collectCmsHeroProjectionRequirements,
  mapCmsHeroBannersToPublicTargets,
} from "./cms-hero-targets"

const baseBanner = {
  id: "cms-hero-1",
  imageSrc: "https://cdn.example.test/hero.jpg",
  title: "Hero",
} satisfies CmsHeroBannerItem

describe("CMS hero URL projections", () => {
  it("ignores legacy buttonHref while preserving a stable target", () => {
    expect(
      mapCmsHeroCarouselToHeroBanner({
        id: 1,
        image: "https://cdn.example.test/hero.jpg",
        button: "Open",
        buttonHref: "/legacy-free-form-path",
        buttonTarget: {
          targetType: "static",
          staticRouteKey: "root:about",
        },
      })
    ).toEqual({
      buttonTarget: { targetType: "static", staticRouteKey: "root:about" },
      ctaLabel: "Open",
      id: "cms-hero-carousel-1",
      imageSrc: "https://cdn.example.test/hero.jpg",
    })
  })

  it("collects stable entity identities and static keys for batch reads", () => {
    const banners: CmsHeroBannerItem[] = [
      {
        ...baseBanner,
        buttonTarget: {
          targetType: "entity",
          sourceSystem: "medusa",
          sourceType: "product",
          sourceId: "prod_1",
        },
      },
      {
        ...baseBanner,
        id: "cms-hero-2",
        buttonTarget: {
          targetType: "static",
          staticRouteKey: "root:about",
        },
      },
    ]

    expect(collectCmsHeroProjectionRequirements(banners)).toEqual({
      entityIdentitiesByKind: {
        product: [
          {
            sourceId: "prod_1",
            sourceSystem: "medusa",
            sourceType: "product",
          },
        ],
      },
      staticRouteKeys: ["root:about"],
    })
  })

  it("projects only URLR-provided slugs and hrefs into client props", () => {
    const banners: CmsHeroBannerItem[] = [
      {
        ...baseBanner,
        buttonTarget: {
          targetType: "entity",
          sourceSystem: "payload",
          sourceType: "article",
          sourceId: "42",
        },
      },
      {
        ...baseBanner,
        id: "cms-hero-2",
        buttonTarget: {
          targetType: "static",
          staticRouteKey: "root:about",
        },
      },
    ]

    expect(
      mapCmsHeroBannersToPublicTargets(banners, {
        entityPublicSlugsByKind: {
          article: { "42": "current-article" },
        },
        staticHrefsByRouteKey: { "root:about": "/o-nas" },
      })
    ).toEqual({
      kind: "found",
      value: [
        {
          ...baseBanner,
          ctaTarget: { kind: "article", publicSlug: "current-article" },
        },
        {
          ...baseBanner,
          id: "cms-hero-2",
          ctaTarget: { href: "/o-nas", kind: "static" },
        },
      ],
    })
  })

  it("fails closed when any requested target has no projection", () => {
    expect(
      mapCmsHeroBannersToPublicTargets(
        [
          {
            ...baseBanner,
            buttonTarget: {
              targetType: "entity",
              sourceSystem: "medusa",
              sourceType: "category",
              sourceId: "pcat_missing",
            },
          },
        ],
        { entityPublicSlugsByKind: {}, staticHrefsByRouteKey: {} }
      )
    ).toEqual({
      causeCode: "MISSING_HERO_ENTITY_PUBLIC_PROJECTION",
      kind: "invalid-response",
    })
  })
})
