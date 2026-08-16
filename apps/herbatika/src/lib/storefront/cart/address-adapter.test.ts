import { describe, expect, it } from "vitest"
import { DEFAULT_CHECKOUT_ADDRESS_VALUES } from "@/lib/forms/checkout/address.form"
import {
  buildHerbatikaCheckoutAddressInput,
  mapHerbatikaAddressFormStateFromMedusaAddress,
} from "./address-adapter"

describe("Herbatika checkout address adapter", () => {
  it("does not store an order note in address data", () => {
    const input = buildHerbatikaCheckoutAddressInput({
      ...DEFAULT_CHECKOUT_ADDRESS_VALUES,
      customerNote: "Please call before delivery",
    })

    expect(input).not.toHaveProperty("customerNote")
    expect(input.metadata).toBeUndefined()
  })

  it("still reads the legacy address note for an existing cart", () => {
    expect(
      mapHerbatikaAddressFormStateFromMedusaAddress({
        metadata: { customer_note: "  Legacy checkout note  " },
      }).customerNote
    ).toBe("Legacy checkout note")
  })
})
