import {
  buildCompanyInfoLookupQuery,
  isDefined,
  normalizeCountryCodeFromCompanyInfo,
  resolveCurrencyFromCountry,
  toTrimmedOrNull,
} from "../company-form-utils"

describe("company form utils", () => {
  describe("toTrimmedOrNull", () => {
    it("returns trimmed string when input has non-whitespace characters", () => {
      expect(toTrimmedOrNull("  ACME  ")).toBe("ACME")
    })

    it("returns null for whitespace-only input", () => {
      expect(toTrimmedOrNull("   ")).toBeNull()
    })
  })

  describe("isDefined", () => {
    it("returns true for defined values including falsy values", () => {
      expect(isDefined("")).toBe(true)
      expect(isDefined(0)).toBe(true)
      expect(isDefined(false)).toBe(true)
    })

    it("returns false for nullish values", () => {
      expect(isDefined(null)).toBe(false)
      expect(isDefined(undefined)).toBe(false)
    })
  })

  describe("normalizeCountryCodeFromCompanyInfo", () => {
    it("passes through valid alpha-2 country codes", () => {
      expect(normalizeCountryCodeFromCompanyInfo("CZ")).toBe("cz")
      expect(normalizeCountryCodeFromCompanyInfo("us")).toBe("us")
    })

    it("normalizes valid values with surrounding whitespace", () => {
      expect(normalizeCountryCodeFromCompanyInfo("  DE  ")).toBe("de")
    })

    it("rejects invalid alpha-2 country codes", () => {
      expect(normalizeCountryCodeFromCompanyInfo("ZZZ")).toBeUndefined()
      expect(normalizeCountryCodeFromCompanyInfo("1A")).toBeUndefined()
      expect(normalizeCountryCodeFromCompanyInfo("")).toBeUndefined()
    })

    it("returns undefined for missing or whitespace-only values", () => {
      expect(normalizeCountryCodeFromCompanyInfo(undefined)).toBeUndefined()
      expect(normalizeCountryCodeFromCompanyInfo(null)).toBeUndefined()
      expect(normalizeCountryCodeFromCompanyInfo("   ")).toBeUndefined()
    })
  })

  describe("resolveCurrencyFromCountry", () => {
    const regions = [
      {
        currency_code: "czk",
        countries: [{ iso_2: "cz" }],
      },
      {
        currency_code: "usd",
        countries: [{ iso_2: "us" }],
      },
    ]

    it("returns undefined when country is not provided", () => {
      expect(resolveCurrencyFromCountry(undefined, regions)).toBeUndefined()
    })

    it("finds currency by country code case-insensitively", () => {
      expect(resolveCurrencyFromCountry("CZ", regions)).toBe("czk")
    })

    it("returns undefined when country has no matching region", () => {
      expect(resolveCurrencyFromCountry("pl", regions)).toBeUndefined()
    })

    it("returns undefined when matched region has no currency", () => {
      expect(
        resolveCurrencyFromCountry("gb", [
          {
            countries: [{ iso_2: "gb" }],
          },
        ])
      ).toBeUndefined()
    })

    it("handles regions with missing countries safely", () => {
      expect(
        resolveCurrencyFromCountry("cz", [
          { currency_code: "eur", countries: null },
          { currency_code: "czk" },
        ])
      ).toBeUndefined()
    })
  })

  describe("buildCompanyInfoLookupQuery", () => {
    it("prefers company identification number and strips internal spaces", () => {
      expect(
        buildCompanyInfoLookupQuery({
          company_identification_number: " 123 456 78 ",
          vat_identification_number: "cz12345678",
          name: "ACME",
        })
      ).toEqual({
        company_identification_number: "12345678",
      })
    })

    it("falls back to normalized VAT when company id is not present", () => {
      expect(
        buildCompanyInfoLookupQuery({
          company_identification_number: " ",
          vat_identification_number: " cz12345678 ",
          name: "ACME",
        })
      ).toEqual({
        vat_identification_number: "CZ12345678",
      })
    })

    it("falls back to trimmed company name when id and VAT are not present", () => {
      expect(
        buildCompanyInfoLookupQuery({
          company_identification_number: " ",
          vat_identification_number: " ",
          name: "  ACME s.r.o.  ",
        })
      ).toEqual({
        company_name: "ACME s.r.o.",
      })
    })

    it("returns undefined when no queryable value is provided", () => {
      expect(
        buildCompanyInfoLookupQuery({
          company_identification_number: " ",
          vat_identification_number: " ",
          name: " ",
        })
      ).toBeUndefined()
    })
  })
})
