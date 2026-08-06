import { describe, expect, it } from "vitest"
import {
  MAX_SLUG_LENGTH,
  RESERVED_SLUGS,
  type SlugError,
  slugify,
  validateSlug,
} from "./slug"

describe("slugify", () => {
  it.each([
    ["Žltý čaj s ľubovníkom", "zlty-caj-s-lubovnikom"],
    ["Příliš žluťoučký kůň", "prilis-zlutoucky-kun"],
    ["Őszi fű, árvíztűrő tükörfúrógép", "oszi-fu-arvizturo-tukorfurogep"],
    ["Cămaşă ţărănească, coș și țară", "camasa-taraneasca-cos-si-tara"],
  ])("transliterates %s", (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it("normalizes decomposed input through NFC", () => {
    expect(slugify("Častervé")).toBe("casterve")
  })

  it("rejects an empty result without inventing a fallback", () => {
    expect(() => slugify("?! 🫖")).toThrowError(
      expect.objectContaining<Partial<SlugError>>({ reason: "empty" })
    )
  })

  it("rejects reserved route words", () => {
    for (const word of RESERVED_SLUGS) {
      expect(() => validateSlug(word)).toThrowError(
        expect.objectContaining<Partial<SlugError>>({ reason: "reserved" })
      )
    }
    expect(() => slugify("API")).toThrowError(
      expect.objectContaining<Partial<SlugError>>({ reason: "reserved" })
    )
  })

  it("rejects collisions instead of suffixing", () => {
    expect(() =>
      slugify("Zelený čaj", { existingSlugs: ["zeleny-caj"] })
    ).toThrowError(
      expect.objectContaining<Partial<SlugError>>({ reason: "collision" })
    )
  })

  it("rejects non-canonical and overlong values", () => {
    expect(() => validateSlug("Upper_Case")).toThrowError(
      expect.objectContaining<Partial<SlugError>>({
        reason: "invalid-characters",
      })
    )
    expect(() => validateSlug("a".repeat(MAX_SLUG_LENGTH + 1))).toThrowError(
      expect.objectContaining<Partial<SlugError>>({ reason: "too-long" })
    )
  })
})
