import { describe, expect, it } from "vitest"
import {
  getAuthPasswordPolicyViolation,
  isRegistrationCompanyIdentifierValid,
  isRegistrationCompanyNameValid,
  isRegistrationNameValid,
  isRegistrationPostalCodeValid,
  isRegistrationTermsAcceptanceValid,
  REGISTRATION_TERMS_VERSION,
} from "./registration-policy"

describe("shared registration policy", () => {
  it.each([
    ["", "required"],
    ["short1", "min-length"],
    ["long-enough", "number"],
    ["long-enough1", null],
  ] as const)("classifies password %j", (password, violation) => {
    expect(getAuthPasswordPolicyViolation(password)).toBe(violation)
  })

  it("bounds customer and company identity fields", () => {
    expect(isRegistrationNameValid("Jo")).toBe(true)
    expect(isRegistrationNameValid("J")).toBe(false)
    expect(isRegistrationNameValid("J".repeat(101))).toBe(false)
    expect(isRegistrationCompanyNameValid("ACME")).toBe(true)
    expect(isRegistrationCompanyNameValid("A".repeat(256))).toBe(false)
    expect(isRegistrationCompanyIdentifierValid("1234")).toBe(true)
    expect(isRegistrationCompanyIdentifierValid("123")).toBe(false)
  })

  it.each([
    ["sk", "811 01", true],
    ["cz", "110 00", true],
    ["hu", "1051", true],
    ["ro", "010101", true],
    ["ro", "01010", false],
    ["ro", "01A101", false],
  ])("validates %s postal code %s", (country, postalCode, valid) => {
    expect(isRegistrationPostalCodeValid(postalCode, country)).toBe(valid)
  })

  it("requires an exact current terms acceptance", () => {
    expect(
      isRegistrationTermsAcceptanceValid(true, REGISTRATION_TERMS_VERSION)
    ).toBe(true)
    expect(
      isRegistrationTermsAcceptanceValid(false, REGISTRATION_TERMS_VERSION)
    ).toBe(false)
    expect(isRegistrationTermsAcceptanceValid(true, "stale-version")).toBe(
      false
    )
  })
})
