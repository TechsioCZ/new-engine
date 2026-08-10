import { describe, expect, it } from "vitest"

import type { HerbatikaMarketContext } from "@/lib/storefront/market-context"

import { createAddressFieldValidators } from "./address"
import type { AddressValidationMessages } from "./address"

const messages = {
  addressMinLength: "address-min-length",
  addressRequired: "address-required",
  cityMinLength: "city-min-length",
  cityRequired: "city-required",
  companyIdMinLength: "company-id-min-length",
  companyIdRequired: "company-id-required",
  companyNameMinLength: "company-name-min-length",
  companyNameRequired: "company-name-required",
  countryInvalid: "country-invalid",
  countryRequired: "country-required",
  emailInvalid: "email-invalid",
  emailRequired: "email-required",
  firstNameMinLength: "first-name-min-length",
  lastNameMinLength: "last-name-min-length",
  phoneInvalid: "phone-invalid",
  phoneMinDigits: "phone-min-digits",
  phoneRequired: "phone-required",
  postalCodeInvalid: "postal-code-invalid",
  postalCodeMinDigits: "postal-code-min-digits",
  postalCodeRequired: "postal-code-required",
  taxIdMinLength: "tax-id-min-length",
  taxIdRequired: "tax-id-required",
} satisfies AddressValidationMessages

describe("postal-code validation", () => {
  it.each<{
    countryCode: HerbatikaMarketContext["countryCode"]
    postalCode: string
  }>([
    { countryCode: "cz", postalCode: "12345" },
    { countryCode: "sk", postalCode: "123 45" },
    { countryCode: "hu", postalCode: "0123" },
    { countryCode: "ro", postalCode: "012345" },
  ])(
    "accepts the required digit count for $countryCode",
    ({ countryCode, postalCode }) => {
      const validators = createAddressFieldValidators(messages, countryCode)

      expect(validators.postalCode(postalCode)).toBeUndefined()
    },
  )

  it.each<{
    countryCode: HerbatikaMarketContext["countryCode"]
    postalCode: string
  }>([
    { countryCode: "cz", postalCode: "1234" },
    { countryCode: "cz", postalCode: "123456" },
    { countryCode: "sk", postalCode: "1234" },
    { countryCode: "sk", postalCode: "123456" },
    { countryCode: "hu", postalCode: "123" },
    { countryCode: "hu", postalCode: "12345" },
    { countryCode: "ro", postalCode: "12345" },
    { countryCode: "ro", postalCode: "1234567" },
  ])(
    "rejects the wrong digit count for $countryCode: $postalCode",
    ({ countryCode, postalCode }) => {
      const validators = createAddressFieldValidators(messages, countryCode)

      expect(validators.postalCode(postalCode)).toBe(messages.postalCodeInvalid)
    },
  )

  it("preserves required-value and invalid-character errors", () => {
    const validators = createAddressFieldValidators(messages, "cz")

    expect(validators.postalCode("  ")).toBe(messages.postalCodeRequired)
    expect(validators.postalCode("12A45")).toBe(messages.postalCodeInvalid)
  })
})
