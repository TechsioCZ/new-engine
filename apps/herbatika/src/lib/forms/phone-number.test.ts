import { getPhoneInputValueDetails } from "@techsio/ui-kit/molecules/phone-input"
import { describe, expect, it } from "vitest"
import {
  createOptionalPhoneNumberValidator,
  HERBATIKA_PHONE_COUNTRY_CODES,
  normalizePhoneNumberToE164,
  toPhoneFormValue,
} from "./phone-number"

const invalidMessage = "phone-invalid"

describe("phone-number validation", () => {
  it.each([
    ["SK", "0905 123 456"],
    ["CZ", "464 664 645"],
    ["HU", "30 123 4567"],
    ["RO", "722 123 456"],
  ])("accepts a valid %s phone number", (countryCode, phoneNumber) => {
    const validate = createOptionalPhoneNumberValidator(
      invalidMessage,
      countryCode
    )

    expect(validate(phoneNumber)).toBeUndefined()
  })

  it("supports exactly the Herbatika market countries", () => {
    expect(HERBATIKA_PHONE_COUNTRY_CODES).toEqual(["SK", "CZ", "HU", "RO"])
  })

  it("rejects numbers that are possible by length but invalid for the region", () => {
    const validate = createOptionalPhoneNumberValidator(invalidMessage, "CZ")

    expect(validate("4646646456")).toBe(invalidMessage)
    expect(validate("111111111")).toBe(invalidMessage)
  })

  it("uses the country encoded by the phone prefix", () => {
    const validate = createOptionalPhoneNumberValidator(invalidMessage, "SK")

    expect(validate("+420601123456")).toBeUndefined()
  })

  it("uses one invalid-number error for malformed and unsupported numbers", () => {
    const validate = createOptionalPhoneNumberValidator(invalidMessage, "SK")

    expect(validate("+421123456")).toBe(invalidMessage)
    expect(validate("+42112345678")).toBe(invalidMessage)
    expect(validate("+436641234567")).toBe(invalidMessage)
    expect(validate("+4915112345678")).toBe(invalidMessage)
    expect(validate("123+4567")).toBe(invalidMessage)
  })

  it("keeps an empty optional value valid", () => {
    const validate = createOptionalPhoneNumberValidator(invalidMessage, "SK")

    expect(validate("  ")).toBeUndefined()
  })
})

describe("phone-number normalization", () => {
  it("stores input details with their selected country prefix", () => {
    const details = getPhoneInputValueDetails("0905 123 456", "SK")

    expect(toPhoneFormValue(details)).toBe("+421905123456")
  })

  it("normalizes legacy national values to E.164", () => {
    expect(normalizePhoneNumberToE164("0905 123 456", "SK")).toBe(
      "+421905123456"
    )
  })

  it("keeps an explicit selected country instead of the fallback country", () => {
    expect(normalizePhoneNumberToE164("+420601123456", "SK")).toBe(
      "+420601123456"
    )
  })

  it("does not normalize a number that is invalid for its region", () => {
    expect(normalizePhoneNumberToE164("4646646456", "CZ")).toBeUndefined()
  })
})
