import { MedusaError } from "@medusajs/framework/utils"
import {
  extractMojeDaneStatusPayload,
  isViesGroupRegistrationName,
  mapMojeDaneStatus,
  mapViesResponse,
  normalizeDicDigits,
  parseVatIdentificationNumber,
  resolveAresSubjectVatIdentificationNumber,
} from "../utils"
import type { ViesCheckVatResponse } from "../types"

describe("parseVatIdentificationNumber", () => {
  it("parses and normalizes VAT identification numbers", () => {
    const result = parseVatIdentificationNumber(" cz12345678 ")

    expect(result).toEqual({
      countryCode: "CZ",
      vatNumber: "12345678",
    })
  })

  it("accepts alphanumeric VAT identification numbers", () => {
    const result = parseVatIdentificationNumber(" frxX123456789 ")

    expect(result).toEqual({
      countryCode: "FR",
      vatNumber: "XX123456789",
    })
  })

  it("throws for invalid VAT identification numbers", () => {
    try {
      parseVatIdentificationNumber("CZ")
      throw new Error("Expected parseVatIdentificationNumber to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(MedusaError)
      expect((error as MedusaError).type).toBe(MedusaError.Types.INVALID_DATA)
    }
  })
})

describe("mapViesResponse", () => {
  it("maps VIES response to the store response shape", () => {
    const response: ViesCheckVatResponse = {
      valid: true,
      name: "ACME s.r.o.",
      requestDate: "2026-02-08",
      requestIdentifier: "REQ-001",
      traderNameMatch: "MATCH",
    }

    expect(mapViesResponse(response)).toEqual({
      valid: true,
      name: "ACME s.r.o.",
      address: null,
      is_group_registration: false,
      request_date: "2026-02-08",
      request_identifier: "REQ-001",
      trader_name_match: "MATCH",
      trader_address_match: null,
      trader_company_type_match: null,
      trader_street_match: null,
      trader_postal_code_match: null,
      trader_city_match: null,
    })
  })

  it("marks VIES group registrations as unresolved company identity", () => {
    const response: ViesCheckVatResponse = {
      valid: true,
      name: "Group registration - This VAT ID corresponds to a Group of Taxpayers",
      address: "N/A",
    }

    expect(mapViesResponse(response)).toEqual({
      valid: true,
      name: null,
      address: null,
      is_group_registration: true,
      request_date: null,
      request_identifier: null,
      trader_name_match: null,
      trader_address_match: null,
      trader_company_type_match: null,
      trader_street_match: null,
      trader_postal_code_match: null,
      trader_city_match: null,
    })
  })
})

describe("isViesGroupRegistrationName", () => {
  it("detects the VIES group-registration marker case-insensitively", () => {
    expect(
      isViesGroupRegistrationName(
        " group registration - this vat id corresponds to a group of taxpayers "
      )
    ).toBe(true)
  })

  it("returns false for regular company names", () => {
    expect(isViesGroupRegistrationName("ACME s.r.o.")).toBe(false)
  })
})

describe("resolveAresSubjectVatIdentificationNumber", () => {
  it("uses dicSkDph when it is defined", () => {
    expect(
      resolveAresSubjectVatIdentificationNumber({
        dic: "CZ12345678",
        dicSkDph: " sk1234567890 ",
      })
    ).toBe("SK1234567890")
  })

  it("falls back to dic when dicSkDph is undefined", () => {
    expect(
      resolveAresSubjectVatIdentificationNumber({
        dic: " cz12345678 ",
      })
    ).toBe("CZ12345678")
  })

  it("falls back to dic when dicSkDph is explicitly null", () => {
    expect(
      resolveAresSubjectVatIdentificationNumber({
        dic: "CZ12345678",
        dicSkDph: null,
      })
    ).toBe("CZ12345678")
  })
})

describe("normalizeDicDigits", () => {
  it("normalizes CZ-prefixed values", () => {
    expect(normalizeDicDigits(" cz12345678 ")).toBe("12345678")
  })

  it("throws when DIC is empty", () => {
    expect(() => normalizeDicDigits(" ")).toThrow(MedusaError)
  })

  it("throws when DIC has invalid format", () => {
    expect(() => normalizeDicDigits("CZ12A3")).toThrow(MedusaError)
  })
})

describe("extractMojeDaneStatusPayload", () => {
  it("returns payload nested inside arrays/objects", () => {
    expect(
      extractMojeDaneStatusPayload({
        envelope: [
          { ignored: true },
          { body: { nespolehlivyPlatce: "NE", typSubjektu: "PLATCE" } },
        ],
      })
    ).toEqual({
      nespolehlivyPlatce: "NE",
      typSubjektu: "PLATCE",
    })
  })

  it("returns null for non-record inputs and when max depth is exceeded", () => {
    expect(extractMojeDaneStatusPayload("invalid")).toBeNull()

    const tooDeep = {
      a: { b: { c: { d: { e: { f: { g: { nespolehlivyPlatce: "NE" } } } } } } },
    }
    expect(extractMojeDaneStatusPayload(tooDeep)).toBeNull()
  })
})

describe("mapMojeDaneStatus", () => {
  it("maps ANO to unreliable subject", () => {
    expect(
      mapMojeDaneStatus({
        nespolehlivyPlatce: "ANO",
        datumZverejneniNespolehlivosti: "2026-01-01",
        typSubjektu: "PLATCE",
      })
    ).toEqual({
      reliable: false,
      unreliable_published_at: "2026-01-01",
      subject_type: "PLATCE",
    })
  })

  it("maps NENALEZEN to null reliability fields", () => {
    expect(
      mapMojeDaneStatus({
        nespolehlivyPlatce: "NENALEZEN",
      })
    ).toEqual({
      reliable: null,
      unreliable_published_at: null,
      subject_type: null,
    })
  })

  it("keeps unreliable_published_at null for reliable subjects", () => {
    expect(
      mapMojeDaneStatus({
        nespolehlivyPlatce: "NE",
        datumZverejneniNespolehlivosti: "2026-01-01",
        typSubjektu: "PLATCE",
      })
    ).toEqual({
      reliable: true,
      unreliable_published_at: null,
      subject_type: "PLATCE",
    })
  })
})
