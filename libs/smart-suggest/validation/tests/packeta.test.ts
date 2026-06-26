import { describe, expect, it } from "vitest"

import { validatePacketaContact } from "../src/index"

describe("validatePacketaContact", () => {
  it("accepts a valid mobile phone for pickup points", () => {
    expect(
      validatePacketaContact({
        deliveryType: "pickup-point",
        phone: "+420 777 123 456",
        defaultCountry: "CZ",
        allowedCountries: ["CZ"],
        requireCountryMatch: true,
      })
    ).toMatchObject({
      isValid: true,
      phone: { e164: "+420777123456", errors: [] },
      fieldErrors: { phone: [] },
    })
  })

  it("requires phone presence", () => {
    const result = validatePacketaContact({
      deliveryType: "pickup-point",
      phone: "",
      defaultCountry: "CZ",
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.fieldErrors.phone).toContainEqual(
      expect.objectContaining({ code: "phone.required" })
    )
  })

  it("rejects fixed-line phones for pickup point delivery", () => {
    const result = validatePacketaContact({
      deliveryType: "pickup-point",
      phone: "+420 222 111 222",
      defaultCountry: "CZ",
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.fieldErrors.phone).toContainEqual(
      expect.objectContaining({ code: "phone.mobile_required" })
    )
  })

  it("allows home-delivery fixed-line phones unless policy requires mobile", () => {
    expect(
      validatePacketaContact({
        deliveryType: "home-delivery",
        phone: "+420 222 111 222",
        defaultCountry: "CZ",
      })
    ).toMatchObject({ isValid: true, fieldErrors: { phone: [] } })
  })

  it("reports country mismatch", () => {
    const result = validatePacketaContact({
      deliveryType: "pickup-point",
      phone: "+421 905 123 456",
      defaultCountry: "CZ",
      requireCountryMatch: true,
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.fieldErrors.phone).toContainEqual(
      expect.objectContaining({ code: "phone.country_mismatch" })
    )
  })

  it("reports malformed phones", () => {
    const result = validatePacketaContact({
      deliveryType: "pickup-point",
      phone: "abc",
      defaultCountry: "CZ",
    })

    expect(result).toMatchObject({ isValid: false })
    expect(result.fieldErrors.phone.length).toBeGreaterThan(0)
  })
})
