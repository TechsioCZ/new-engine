import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import { resolveHasStoredAddress } from "./checkout-address.utils"

const createCart = (phone?: string) => {
  const address = {
    address_1: "Testing 5",
    city: "Testing",
    country_code: "sk",
    first_name: "John",
    last_name: "Doe",
    postal_code: "12345",
  }

  return {
    billing_address: address,
    email: "john@example.com",
    shipping_address: { ...address, phone },
  } as unknown as HttpTypes.StoreCart
}

describe("resolveHasStoredAddress", () => {
  it("accepts a stored address with a valid contact phone", () => {
    expect(resolveHasStoredAddress(createCart("0905 123 456"), "sk")).toBe(true)
  })

  it.each([
    undefined,
    "+42155555555555",
  ])("rejects a stored address with an invalid contact phone: %s", (phone) => {
    expect(resolveHasStoredAddress(createCart(phone), "sk")).toBe(false)
  })
})
