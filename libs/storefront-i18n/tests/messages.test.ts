import { describe, expect, it } from "vitest"
import { nestStorefrontMessages } from "../src/core/messages"

describe("nestStorefrontMessages", () => {
  it("converts dotted backend keys to nested messages", () => {
    expect(
      nestStorefrontMessages({
        "cart.add_to_cart": "Add to cart",
        "checkout.steps.summary": "Summary",
      })
    ).toEqual({
      cart: {
        add_to_cart: "Add to cart",
      },
      checkout: {
        steps: {
          summary: "Summary",
        },
      },
    })
  })

  it("rejects keys that collide with a message namespace", () => {
    expect(() =>
      nestStorefrontMessages({
        cart: "Cart",
        "cart.title": "Your cart",
      })
    ).toThrow("Conflicting storefront message key: cart.title")
  })

  it("treats inherited object properties as message namespaces", () => {
    expect(
      nestStorefrontMessages({
        "toString.title": "Title",
      })
    ).toEqual({
      toString: {
        title: "Title",
      },
    })
  })

  it.each(["cart..title", "cart.__proto__.title", "cart.constructor.title"])(
    "rejects invalid key %s",
    (key) => {
      expect(() => nestStorefrontMessages({ [key]: "value" })).toThrow(
        `Invalid storefront message key: ${key}`
      )
    }
  )
})
