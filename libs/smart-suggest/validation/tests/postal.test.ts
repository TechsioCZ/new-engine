import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import { describe, expect, it } from "vitest"

import { getPostalInputHints, validatePostalCode } from "../src/index"

type PostalFixture = readonly [SmartSuggestCountryCode, string, string]

describe("validatePostalCode", () => {
  const validPostalFixtures = [
    ["CZ", "12345", "123 45"],
    ["SK", "81101", "811 01"],
    ["PL", "12345", "12-345"],
    ["DE", "10115", "10115"],
    ["AT", "1010", "1010"],
    ["HU", "1051", "1051"],
    ["RO", "010011", "010011"],
    ["GB", "sw1a1aa", "SW1A 1AA"],
    ["CA", "k1a0b1", "K1A 0B1"],
    ["US", "90210-1234", "90210-1234"],
  ] satisfies readonly PostalFixture[]

  it.each(
    validPostalFixtures
  )("normalizes and validates %s postal codes", (countryCode, rawInput, displayValue) => {
    expect(validatePostalCode({ countryCode, rawInput })).toMatchObject({
      countryCode,
      displayValue,
      isValid: true,
      errors: [],
    })
  })

  it("keeps unsupported countries tolerant with unknown validity", () => {
    expect(
      validatePostalCode({ countryCode: "ZZ", rawInput: "12345" })
    ).toMatchObject({
      countryCode: "ZZ",
      isValid: "unknown",
      errors: [expect.objectContaining({ code: "postal.country_unsupported" })],
    })
  })

  it("reports invalid postal codes with structured errors", () => {
    const result = validatePostalCode({
      countryCode: "CZ",
      rawInput: "ABCDE",
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "postal.invalid" })
    )
  })

  it("does not force numeric input for alphanumeric or punctuated countries", () => {
    expect(getPostalInputHints("GB")).toMatchObject({ inputMode: "text" })
    expect(getPostalInputHints("CA")).toMatchObject({ inputMode: "text" })
    expect(getPostalInputHints("US")).toMatchObject({ inputMode: "text" })
  })
})
