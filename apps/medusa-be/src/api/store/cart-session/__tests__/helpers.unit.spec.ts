import { describe, expect, it } from "vitest"
import { createCartSessionToken } from "../../../../utils/cart-session"
import {
  assertExactSignedCartSession,
  projectCheckoutStepState,
} from "../helpers"

const completeAddress = {
  address_1: "Main 1",
  city: "Prague",
  country_code: "cz",
  first_name: "Ada",
  last_name: "Lovelace",
  phone: "+420777123456",
  postal_code: "11000",
}

describe("checkout step projection", () => {
  it("stops at the first unmet checkout requirement", () => {
    expect(
      projectCheckoutStepState({ id: "cart_1", items: [{ id: "item_1" }] })
    ).toEqual({
      default_step: "shipping",
      invalid_provider_state: false,
      reachable_steps: ["shipping"],
    })

    expect(
      projectCheckoutStepState({
        id: "cart_1",
        items: [{ id: "item_1" }],
        shipping_methods: [{ id: "sm_1" }],
      })
    ).toEqual({
      default_step: "contact",
      invalid_provider_state: false,
      reachable_steps: ["shipping", "payment", "contact"],
    })

    expect(
      projectCheckoutStepState({
        email: "ada@example.com",
        id: "cart_1",
        items: [{ id: "item_1" }],
        shipping_address: completeAddress,
        shipping_methods: [{ id: "sm_1" }],
      })
    ).toEqual({
      default_step: "contact",
      invalid_provider_state: false,
      reachable_steps: ["shipping", "payment", "contact"],
    })

    expect(
      projectCheckoutStepState({
        billing_address: completeAddress,
        email: "ada@example.com",
        id: "cart_1",
        items: [{ id: "item_1" }],
        shipping_address: { ...completeAddress, phone: null },
        shipping_methods: [{ id: "sm_1" }],
      })
    ).toEqual({
      default_step: "contact",
      invalid_provider_state: false,
      reachable_steps: ["shipping", "payment", "contact"],
    })

    expect(
      projectCheckoutStepState({
        billing_address: completeAddress,
        email: "ada@example.com",
        id: "cart_1",
        items: [{ id: "item_1" }],
        shipping_address: completeAddress,
        shipping_methods: [{ id: "sm_1" }],
      })
    ).toEqual({
      default_step: "review",
      invalid_provider_state: false,
      reachable_steps: ["shipping", "payment", "contact", "review"],
    })
  })

  it("accepts deferred payment and rejects incoherent provider state", () => {
    expect(
      projectCheckoutStepState({
        billing_address: completeAddress,
        email: "ada@example.com",
        id: "cart_1",
        items: [{ id: "item_1" }],
        payment_collection: {
          payment_sessions: [
            { id: "pay_1", provider_id: "pp_stripe", status: "pending" },
          ],
        },
        shipping_address: completeAddress,
        shipping_methods: [{ id: "sm_1" }],
      })
    ).toEqual({
      default_step: "review",
      invalid_provider_state: false,
      reachable_steps: ["shipping", "payment", "contact", "review"],
    })

    expect(
      projectCheckoutStepState({
        billing_address: completeAddress,
        email: "ada@example.com",
        id: "cart_1",
        items: [{ id: "item_1" }],
        payment_collection: {
          payment_sessions: [
            { id: "pay_1", provider_id: "pp_a", status: "pending" },
            { id: "pay_2", provider_id: "pp_b", status: "pending" },
          ],
        },
        shipping_address: completeAddress,
        shipping_methods: [{ id: "sm_1" }],
      }).invalid_provider_state
    ).toBe(true)
  })
})

describe("signed checkout session", () => {
  it("requires the exact signed cart and market binding", () => {
    const previousSecret = process.env.COOKIE_SECRET
    process.env.COOKIE_SECRET = "cart-session-test-secret"
    try {
      const token = createCartSessionToken(
        { cart_id: "cart_Case", sales_channel_id: "sc_cz" },
        process.env.COOKIE_SECRET
      )
      const request = {
        headers: { "x-cart-session": token },
      } as never

      expect(
        assertExactSignedCartSession(request, "cart_Case", "sc_cz")
      ).toBeUndefined()
      expect(() =>
        assertExactSignedCartSession(request, "cart_case", "sc_cz")
      ).toThrow(expect.objectContaining({ type: "not_found" }))
      expect(() =>
        assertExactSignedCartSession(request, "cart_Case", "sc_sk")
      ).toThrow(expect.objectContaining({ type: "not_found" }))
      expect(() =>
        assertExactSignedCartSession(
          { headers: {} } as never,
          "cart_Case",
          "sc_cz"
        )
      ).toThrow(expect.objectContaining({ type: "not_found" }))
    } finally {
      if (previousSecret === undefined) {
        Reflect.deleteProperty(process.env, "COOKIE_SECRET")
      } else {
        process.env.COOKIE_SECRET = previousSecret
      }
    }
  })
})
