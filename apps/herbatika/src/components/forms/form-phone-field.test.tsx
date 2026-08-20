import { describe, expect, it } from "vitest"
import type { HerbatikaLocale } from "@/lib/storefront/market-context"
import {
  resolvePhoneFieldCountries,
  resolvePhoneFieldPlaceholder,
} from "./form-phone-field"

const labelsByCountry = (locale: HerbatikaLocale) =>
  Object.fromEntries(
    resolvePhoneFieldCountries(locale).map(({ label, value }) => [value, label])
  )

describe("FormPhoneField country picker", () => {
  it("uses Romanian country names in the Romanian market", () => {
    expect(labelsByCountry("ro-RO")).toEqual({
      SK: "Slovacia",
      CZ: "Cehia",
      HU: "Ungaria",
      RO: "România",
    })
  })

  it("keeps Slovak country names in the Slovak market", () => {
    expect(labelsByCountry("sk-SK")).toEqual({
      SK: "Slovensko",
      CZ: "Česko",
      HU: "Maďarsko",
      RO: "Rumunsko",
    })
  })
})

describe("FormPhoneField placeholder", () => {
  it("uses a Romanian mobile example for +40", () => {
    expect(resolvePhoneFieldPlaceholder("RO")).toBe("712 345 678")
  })

  it("keeps the existing Slovak example for +421", () => {
    expect(resolvePhoneFieldPlaceholder("SK")).toBe("900 123 456")
  })
})
