import { mkdtemp, readFile, rm, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  HOMEPAGE_HERO_SOURCE_MANIFEST_ENV,
  readReviewedHomepageHeroBanners,
} from "@/lib/storefront/homepage-hero-source-manifest.server"
import {
  buildReviewedHomepageHeroTestManifest,
  writeReviewedHomepageHeroTestManifest,
} from "./homepage-hero-reviewed-test-manifest"

const SLOVAK_CANARY =
  /rýchle|doručenie|dodanie|otvárame|prevádzku|domácnosť|čistejšie|akčné|vypredania|vyberte|darčeky|pripravené|vašich|dopĺňame|kozmetika/iu
const SHA256 = /^[0-9a-f]{64}$/
const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true }))
  )
})

describe("reviewed homepage hero test manifest", () => {
  it("builds deterministic reviewed CZ/HU/RO entries with registry route keys", () => {
    const first = buildReviewedHomepageHeroTestManifest()
    const second = buildReviewedHomepageHeroTestManifest()

    expect(second).toEqual(first)
    expect(first.manifest.entries.map(({ locale }) => locale)).toEqual([
      "cs-CZ",
      "hu-HU",
      "ro-RO",
    ])
    expect(first.envName).toBe(HOMEPAGE_HERO_SOURCE_MANIFEST_ENV)
    for (const entry of first.manifest.entries) {
      expect(entry.banners).toHaveLength(4)
      expect(entry.source.rawSha256).toMatch(SHA256)
      expect(entry.editorialApproval).toMatchObject({
        approvedBy: "test-only-user-demo-authorization",
        status: "approved",
      })
      for (const banner of entry.banners) {
        expect(banner.buttonTarget).toEqual({
          staticRouteKey: "root:about",
          targetType: "static",
        })
        expect(banner.imageAlt).toBeTruthy()
        expect(banner.title).toBeTruthy()
      }
      const copy = entry.banners
        .flatMap(({ badge, ctaLabel, imageAlt, subtitle, title }) => [
          badge,
          ctaLabel,
          imageAlt,
          subtitle,
          title,
        ])
        .filter(Boolean)
        .join(" ")
      expect(copy).not.toMatch(SLOVAK_CANARY)
    }
  })

  it("is available only through the explicit environment manifest", () => {
    const build = buildReviewedHomepageHeroTestManifest()
    const environment = { [build.envName]: build.envValue }

    expect(readReviewedHomepageHeroBanners("cs-CZ", environment)).toHaveLength(
      4
    )
    expect(readReviewedHomepageHeroBanners("hu-HU", environment)).toHaveLength(
      4
    )
    expect(readReviewedHomepageHeroBanners("ro-RO", environment)).toHaveLength(
      4
    )
    expect(
      readReviewedHomepageHeroBanners("sk-SK", environment)
    ).toBeUndefined()
    expect(readReviewedHomepageHeroBanners("ro-RO", {})).toBeUndefined()
  })

  it("writes a private exact env value and never clobbers it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "homepage-hero-review-"))
    temporaryDirectories.push(directory)
    const output = join(directory, "manifest.json")
    const expected = buildReviewedHomepageHeroTestManifest()

    await expect(
      writeReviewedHomepageHeroTestManifest(output)
    ).resolves.toEqual({
      outputPath: output,
      sha256: expected.envValueSha256,
    })
    expect(await readFile(output, "utf8")).toBe(expected.envValue)
    expect((await stat(output)).mode.toString(8).slice(-3)).toBe("600")
    await expect(
      writeReviewedHomepageHeroTestManifest(output)
    ).rejects.toMatchObject({
      code: "EEXIST",
    })
  })
})
