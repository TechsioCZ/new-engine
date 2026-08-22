import { describe, expect, it } from "vitest"
import {
  createPublishedSlug,
  MAX_PUBLISHED_SLUG_LENGTH,
  PUBLISHED_SLUG_TRANSLITERATION_VERSION,
  type PublishedSlugError,
  RESERVED_PUBLIC_PATH_SEGMENTS,
  validatePublishedSlug,
} from "./slug"

const localeCases = [
  ["sk-SK", "Žltý čaj s ľubovníkom", "zlty-caj-s-lubovnikom"],
  ["cs-CZ", "Příliš žluťoučký kůň", "prilis-zlutoucky-kun"],
  [
    "hu-HU",
    "Őszi fű, árvíztűrő tükörfúrógép",
    "oszi-fu-arvizturo-tukorfurogep",
  ],
  ["ro-RO", "Cămaşă ţărănească, coș și țară", "camasa-taraneasca-cos-si-tara"],
] as const

describe("createPublishedSlug", () => {
  it.each(
    localeCases
  )("uses the frozen %s transliteration", (locale, input, expected) => {
    expect(createPublishedSlug(input, { locale })).toBe(expected)
  })

  it("applies NFKC before locale-aware lowercasing", () => {
    expect(createPublishedSlug("  ＰŘÍLIŠ  ", { locale: "cs-CZ" })).toBe(
      "prilis"
    )
  })

  it("normalizes legacy Romanian cedillas before transliteration", () => {
    expect(createPublishedSlug("ŞŢ şţ ȘȚ șț", { locale: "ro-RO" })).toBe(
      "st-st-st-st"
    )
  })

  it("uses the versioned fallback for other Latin characters", () => {
    expect(PUBLISHED_SLUG_TRANSLITERATION_VERSION).toBe(1)
    expect(
      createPublishedSlug("Straße Łódź Æsir Œuvre", { locale: "sk-SK" })
    ).toBe("strasse-lodz-aesir-oeuvre")
  })

  it("turns separator runs into one hyphen and trims the edges", () => {
    expect(
      createPublishedSlug(" -- Zelený___čaj / kapsuly -- ", {
        locale: "sk-SK",
      })
    ).toBe("zeleny-caj-kapsuly")
  })

  it("rejects an empty result without inventing an ID or random fallback", () => {
    expect(() =>
      createPublishedSlug("?! 🫖", { locale: "sk-SK" })
    ).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({ reason: "empty" })
    )
  })

  it("rejects every reserved public segment before separator rewriting", () => {
    for (const segment of RESERVED_PUBLIC_PATH_SEGMENTS) {
      expect(() =>
        createPublishedSlug(segment.toUpperCase(), { locale: "sk-SK" })
      ).toThrowError(
        expect.objectContaining<Partial<PublishedSlugError>>({
          reason: "reserved",
        })
      )
    }
  })

  it("rejects collisions instead of synthesizing a suffix", () => {
    expect(() =>
      createPublishedSlug("Zelený čaj", {
        existingSlugs: ["zeleny-caj"],
        locale: "sk-SK",
      })
    ).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "collision",
        value: "zeleny-caj",
      })
    )
  })

  it("rejects unsupported publication locales", () => {
    expect(() =>
      createPublishedSlug("İstanbul", {
        locale: "tr-TR" as "sk-SK",
      })
    ).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "unsupported-locale",
      })
    )
  })
})

describe("validatePublishedSlug", () => {
  it("accepts safe persisted customer slugs up to the registry limit", () => {
    const maximumLengthSlug = "a".repeat(MAX_PUBLISHED_SLUG_LENGTH)

    expect(validatePublishedSlug("caj-123")).toBe("caj-123")
    expect(validatePublishedSlug("customer--slug-")).toBe("customer--slug-")
    expect(validatePublishedSlug("-customer-slug")).toBe("-customer-slug")
    expect(validatePublishedSlug(maximumLengthSlug)).toBe(maximumLengthSlug)
  })

  it.each([
    "Upper-Case",
    "under_score",
  ])("rejects the unsafe value %s", (value) => {
    expect(() => validatePublishedSlug(value)).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "invalid-characters",
      })
    )
  })

  it("rejects an overlong value instead of truncating it", () => {
    const overlong = "a".repeat(MAX_PUBLISHED_SLUG_LENGTH + 1)

    expect(() => validatePublishedSlug(overlong)).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "too-long",
      })
    )
  })

  it("rejects reserved and already-published values", () => {
    expect(() => validatePublishedSlug("api")).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "reserved",
      })
    )
    expect(() =>
      validatePublishedSlug("zeleny-caj", {
        existingSlugs: new Set(["zeleny-caj"]),
      })
    ).toThrowError(
      expect.objectContaining<Partial<PublishedSlugError>>({
        reason: "collision",
      })
    )
  })
})
