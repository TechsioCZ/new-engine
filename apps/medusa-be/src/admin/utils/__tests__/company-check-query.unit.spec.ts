import {
  normalizeCompanyCheckCzAddressCountQuery,
  normalizeCompanyCheckCzInfoQuery,
  normalizeCompanyCheckCzTaxReliabilityQuery,
  normalizeCompanyCheckViesQuery,
} from "../company-check-query"

describe("company-check query normalization", () => {
  describe("normalizeCompanyCheckCzInfoQuery", () => {
    it("prefers company identification number over other fields", () => {
      expect(
        normalizeCompanyCheckCzInfoQuery({
          company_identification_number: " 12345678 ",
          vat_identification_number: "cz12345678",
          company_name: "Acme",
        })
      ).toEqual({
        company_identification_number: "12345678",
      })
    })

    it("falls back to VAT and uppercases it", () => {
      expect(
        normalizeCompanyCheckCzInfoQuery({
          vat_identification_number: " cz12345678 ",
        })
      ).toEqual({
        vat_identification_number: "CZ12345678",
      })
    })

    it("falls back to company name when id and vat are not provided", () => {
      expect(
        normalizeCompanyCheckCzInfoQuery({
          company_name: "  ACME s.r.o. ",
        })
      ).toEqual({
        company_name: "ACME s.r.o.",
      })
    })

    it("returns undefined when no usable value exists", () => {
      expect(
        normalizeCompanyCheckCzInfoQuery({
          company_identification_number: " ",
          vat_identification_number: " ",
          company_name: " ",
        })
      ).toBeUndefined()
    })
  })

  describe("normalizeCompanyCheckCzAddressCountQuery", () => {
    it("returns normalized street and city when both are present", () => {
      expect(
        normalizeCompanyCheckCzAddressCountQuery({
          street: "  Main street 1 ",
          city: " Prague ",
        })
      ).toEqual({
        street: "Main street 1",
        city: "Prague",
      })
    })

    it("returns undefined when either street or city is missing", () => {
      expect(
        normalizeCompanyCheckCzAddressCountQuery({
          street: "Main",
          city: " ",
        })
      ).toBeUndefined()

      expect(
        normalizeCompanyCheckCzAddressCountQuery({
          street: " ",
          city: "Prague",
        })
      ).toBeUndefined()
    })
  })

  describe("normalizeCompanyCheckCzTaxReliabilityQuery", () => {
    it("returns uppercased VAT only when format is valid", () => {
      expect(
        normalizeCompanyCheckCzTaxReliabilityQuery({
          vat_identification_number: " cz12345678 ",
        })
      ).toEqual({
        vat_identification_number: "CZ12345678",
      })
    })

    it("returns undefined for invalid VAT identifiers", () => {
      expect(
        normalizeCompanyCheckCzTaxReliabilityQuery({
          vat_identification_number: " 123456 ",
        })
      ).toBeUndefined()
    })
  })

  describe("normalizeCompanyCheckViesQuery", () => {
    it("delegates to tax reliability normalization", () => {
      expect(
        normalizeCompanyCheckViesQuery({
          vat_identification_number: " de123 ",
        })
      ).toEqual({
        vat_identification_number: "DE123",
      })
    })
  })
})
