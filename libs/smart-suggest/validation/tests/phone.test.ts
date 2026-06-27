import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import { describe, expect, it } from "vitest"

import { validatePhoneNumber } from "../src/index"

type PhoneFixture = readonly [SmartSuggestCountryCode, string, string, string]

describe("validatePhoneNumber", () => {
  const validPhoneFixtures = [
    ["CZ", "+420 777 123 456", "+420777123456", "MOBILE"],
    ["SK", "+421 905 123 456", "+421905123456", "MOBILE"],
    ["AT", "+43 664 1234567", "+436641234567", "MOBILE"],
    ["HU", "+36 20 123 4567", "+36201234567", "MOBILE"],
    ["PL", "+48 512 345 678", "+48512345678", "MOBILE"],
    ["DE", "+49 1512 3456789", "+4915123456789", "MOBILE"],
    ["RO", "+40 721 234 567", "+40721234567", "MOBILE"],
    ["GB", "+44 7400 123456", "+447400123456", "MOBILE"],
    ["US", "+1 202 555 0125", "+12025550125", "FIXED_LINE_OR_MOBILE"],
    ["CA", "+1 416 555 0123", "+14165550123", "FIXED_LINE_OR_MOBILE"],
  ] satisfies readonly PhoneFixture[]

  it.each(
    validPhoneFixtures
  )("normalizes a valid %s phone", (defaultCountry, rawInput, e164, expectedType) => {
    expect(
      validatePhoneNumber({
        rawInput,
        defaultCountry,
        requireMobile: true,
      })
    ).toMatchObject({
      e164,
      isPossible: true,
      isValid: true,
      type: expectedType,
      errors: [],
    })
  })

  it("supports local numbers when a default country is provided", () => {
    expect(
      validatePhoneNumber({
        rawInput: "777 123 456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      e164: "+420777123456",
      detectedCountry: "CZ",
      isValid: true,
    })
  })

  it("supports pasted 00 international prefix values", () => {
    expect(
      validatePhoneNumber({
        rawInput: "00420777123456",
        defaultCountry: "CZ",
      })
    ).toMatchObject({
      e164: "+420777123456",
      detectedCountry: "CZ",
      isValid: true,
    })
  })

  it("omits blank country hints instead of treating them as countries", () => {
    expect(
      validatePhoneNumber({
        allowedCountries: ["", "CZ"],
        defaultCountry: "",
        rawInput: "+420 777 123 456",
      })
    ).toMatchObject({
      detectedCountry: "CZ",
      e164: "+420777123456",
      errors: [],
      isValid: true,
    })
  })

  it("rejects fixed-line numbers when mobile is required", () => {
    const result = validatePhoneNumber({
      rawInput: "+420 222 111 222",
      defaultCountry: "CZ",
      requireMobile: true,
    })

    expect(result).toMatchObject({
      isPossible: true,
      isValid: false,
      type: "FIXED_LINE",
    })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.mobile_required" })
    )
  })

  it("reports country mismatch when selected country must match", () => {
    const result = validatePhoneNumber({
      rawInput: "+421 905 123 456",
      defaultCountry: "CZ",
      requireCountryMatch: true,
    })

    expect(result).toMatchObject({
      detectedCountry: "SK",
      isValid: false,
    })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.country_mismatch" })
    )
  })

  it("reports disallowed countries", () => {
    const result = validatePhoneNumber({
      rawInput: "+49 1512 3456789",
      allowedCountries: ["CZ", "SK"],
    })

    expect(result).toMatchObject({ detectedCountry: "DE", isValid: false })
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "phone.country_not_allowed" })
    )
  })

  it("returns structured errors for unknown or malformed input", () => {
    expect(validatePhoneNumber({ rawInput: "not a phone" })).toMatchObject({
      isPossible: false,
      isValid: false,
      errors: [expect.objectContaining({ field: "phone" })],
    })
  })
})
