import { describe, expect, it } from "vitest"

import { generateSlugFromTitle } from "@/lib/hooks/slug"

describe("slug utilities", () => {
  describe(generateSlugFromTitle, () => {
    it.each([
      ["Hello World", "hello-world"],
      ["hello@world#test!", "helloworldtest"],
      ["hello---world", "hello-world"],
      ["  hello world  ", "hello-world"],
      ["Příliš Žluťoučký café", "prilis-zlutoucky-cafe"],
      ["Article 2024", "article-2024"],
      ["!@#$%^&*()", ""],
      ["Top 10 Důvodů pro Nákup!", "top-10-duvodu-pro-nakup"],
    ])("normalizes %s", (title, expected) => {
      expect(generateSlugFromTitle(title)).toBe(expected)
    })

    it("generates slug from string title", () => {
      expect(generateSlugFromTitle("Hello World")).toBe("hello-world")
    })

    it("returns fallback for null title", () => {
      expect(generateSlugFromTitle(null, { fallback: "default" })).toBe(
        "default"
      )
    })

    it("returns fallback for undefined title", () => {
      expect(generateSlugFromTitle(undefined, { fallback: "default" })).toBe(
        "default"
      )
    })

    it("returns empty string as default fallback", () => {
      expect(generateSlugFromTitle(null)).toBe("")
      expect(generateSlugFromTitle()).toBe("")
    })

    it("extracts localized title from object with matching locale", () => {
      const title = { cs: "Český Titulek", en: "English Title" }
      expect(generateSlugFromTitle(title, { locale: "cs" })).toBe(
        "cesky-titulek"
      )
    })

    it("falls back to first available title when locale not found", () => {
      const title = { cs: "Český Titulek", en: "English Title" }
      expect(generateSlugFromTitle(title, { locale: "de" })).toBe(
        "english-title"
      )
    })

    it("uses first available title when no locale specified", () => {
      const title = { cs: "Český Titulek", en: "English Title" }
      expect(generateSlugFromTitle(title)).toBe("english-title")
    })

    it("uses first available title when locale is null", () => {
      const title = { cs: "Český Titulek", en: "English Title" }
      expect(generateSlugFromTitle(title, { locale: null })).toBe(
        "english-title"
      )
    })

    it("returns fallback when localized value is empty string", () => {
      const title = { cs: "Český Titulek", en: "" }
      expect(
        generateSlugFromTitle(title, { fallback: "default", locale: "en" })
      ).toBe("cesky-titulek")
    })

    it("returns fallback when localized value is whitespace only", () => {
      const title = { cs: "Český Titulek", en: "   " }
      expect(
        generateSlugFromTitle(title, { fallback: "default", locale: "en" })
      ).toBe("cesky-titulek")
    })

    it("returns fallback when all values are empty", () => {
      const title = { cs: "", en: "" }
      expect(generateSlugFromTitle(title, { fallback: "default" })).toBe(
        "default"
      )
    })

    it("returns fallback when all values are whitespace", () => {
      const title = { cs: "   ", en: "   " }
      expect(generateSlugFromTitle(title, { fallback: "default" })).toBe(
        "default"
      )
    })

    it("ignores non-string values in title object", () => {
      const title = { cs: "Český Titulek", en: 123 } as unknown
      expect(generateSlugFromTitle(title, { locale: "en" })).toBe(
        "cesky-titulek"
      )
    })

    it("returns fallback when object contains only non-string values", () => {
      const title = { cs: null, en: 123 } as unknown
      expect(generateSlugFromTitle(title, { fallback: "default" })).toBe(
        "default"
      )
    })

    it("handles empty object", () => {
      expect(generateSlugFromTitle({}, { fallback: "default" })).toBe("default")
    })

    it("handles title with only whitespace", () => {
      expect(generateSlugFromTitle("   ", { fallback: "default" })).toBe(
        "default"
      )
    })
  })
})
