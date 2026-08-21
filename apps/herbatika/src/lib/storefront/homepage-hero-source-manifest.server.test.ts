import { describe, expect, it } from "vitest"
import {
  HOMEPAGE_HERO_SOURCE_MANIFEST_ENV,
  HomepageHeroSourceManifestError,
  parseReviewedHomepageHeroManifest,
  readReviewedHomepageHeroBanners,
} from "./homepage-hero-source-manifest.server"

const HASH = "a".repeat(64)

const validManifest = () => ({
  entries: [
    {
      banners: [
        {
          buttonTarget: {
            staticRouteKey: "root:about",
            targetType: "static",
          },
          ctaLabel: "Zjistit více",
          id: "reviewed-cz-hero",
          imageAlt: "Schválený testovací obrázek",
          imageSrc: "https://cdn.example.test/cz-hero.avif",
          title: "Schválený testovací banner",
        },
      ],
      editorialApproval: {
        approvedAt: "2026-08-21T12:00:00Z",
        approvedBy: "editor@example.test",
        reference: "https://reviews.example.test/approvals/cz-hero-1",
        status: "approved",
      },
      locale: "cs-CZ",
      source: {
        rawSha256: HASH,
        reference: "https://source.example.test/homepage/cs-CZ",
      },
    },
  ],
  schemaVersion: 1,
})

describe("reviewed homepage hero source manifest", () => {
  it("accepts an exact approved locale entry with raw-source evidence", () => {
    const raw = JSON.stringify(validManifest())
    const parsed = parseReviewedHomepageHeroManifest(raw)

    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.entries[0]).toMatchObject({
      editorialApproval: { status: "approved" },
      locale: "cs-CZ",
      source: { rawSha256: HASH },
    })
    const environment = { [HOMEPAGE_HERO_SOURCE_MANIFEST_ENV]: raw }
    expect(readReviewedHomepageHeroBanners("cs-CZ", environment)).toEqual(
      parsed.entries[0]?.banners
    )
    expect(
      readReviewedHomepageHeroBanners("hu-HU", environment)
    ).toBeUndefined()
    expect(readReviewedHomepageHeroBanners("cs-CZ", {})).toBeUndefined()
  })

  it("rejects manifests without exact editorial approval", () => {
    const input = validManifest()
    const raw = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          editorialApproval: {
            ...input.entries[0]?.editorialApproval,
            status: "pending",
          },
        },
      ],
    })

    expect(() => parseReviewedHomepageHeroManifest(raw)).toThrow(
      HomepageHeroSourceManifestError
    )
  })

  it("rejects malformed raw SHA evidence and unknown fields", () => {
    const input = validManifest()
    const wrongHash = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          source: {
            ...input.entries[0]?.source,
            rawSha256: HASH.toUpperCase(),
          },
        },
      ],
    })
    const unknownField = JSON.stringify({ ...input, campaign: "unreviewed" })

    expect(() => parseReviewedHomepageHeroManifest(wrongHash)).toThrow(
      "rawSha256 must be a lowercase SHA-256 digest"
    )
    expect(() => parseReviewedHomepageHeroManifest(unknownField)).toThrow(
      "root.campaign is not allowed"
    )
  })

  it("rejects duplicate banners and unregistered link shapes", () => {
    const input = validManifest()
    const banner = input.entries[0]?.banners[0]
    const duplicates = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          banners: [banner, banner],
        },
      ],
    })
    const directHref = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          banners: [
            {
              ...banner,
              buttonTarget: {
                href: "https://example.test/unregistered",
                targetType: "static",
              },
            },
          ],
        },
      ],
    })

    expect(() => parseReviewedHomepageHeroManifest(duplicates)).toThrow(
      "banners contains duplicate ids"
    )
    expect(() => parseReviewedHomepageHeroManifest(directHref)).toThrow(
      "buttonTarget.href is not allowed"
    )
  })

  it("requires accessible image copy and paired CTA targets", () => {
    const input = validManifest()
    const banner = input.entries[0]?.banners[0]
    const missingAlt = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          banners: [
            {
              buttonTarget: banner?.buttonTarget,
              ctaLabel: banner?.ctaLabel,
              id: banner?.id,
              imageSrc: banner?.imageSrc,
              title: banner?.title,
            },
          ],
        },
      ],
    })
    const unpairedCta = JSON.stringify({
      ...input,
      entries: [
        {
          ...input.entries[0],
          banners: [{ ...banner, buttonTarget: undefined }],
        },
      ],
    })

    expect(() => parseReviewedHomepageHeroManifest(missingAlt)).toThrow(
      "imageAlt is required"
    )
    expect(() => parseReviewedHomepageHeroManifest(unpairedCta)).toThrow(
      "buttonTarget must be provided together"
    )
  })
})
