import { MedusaError } from "@medusajs/framework/utils"
import { describe, expect, it } from "vitest"
import {
  resolveStoreCmsLocale,
  StoreCmsLocaleQuerySchema,
} from "../../../../../../src/api/store/cms/locales"

describe("store CMS locale handling", () => {
  it("allows query validation after Medusa consumes the reserved locale parameter", () => {
    expect(StoreCmsLocaleQuerySchema.parse(undefined)).toBeUndefined()
  })

  it.each([
    "sk",
    "cs",
    "hu",
    "ro",
  ] as const)("resolves the supported %s locale from the request context", (locale) => {
    expect(resolveStoreCmsLocale(locale)).toBe(locale)
  })

  it("rejects a missing locale at the handler boundary", () => {
    expect(() => resolveStoreCmsLocale()).toThrowError(MedusaError)
    expect(() => resolveStoreCmsLocale()).toThrow("Field 'locale' is required")
  })

  it("rejects locales outside the four live markets", () => {
    expect(() => resolveStoreCmsLocale("en")).toThrow(
      'Unsupported CMS locale "en"'
    )
  })
})
