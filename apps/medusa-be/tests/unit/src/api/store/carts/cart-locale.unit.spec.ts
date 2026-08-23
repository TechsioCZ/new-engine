import type { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { describe, expect, it, vi } from "vitest"
import { bindCartLocaleFromRequest } from "../../../../../../src/api/store/carts/cart-locale"
import { storeCartsMiddlewares } from "../../../../../../src/api/store/carts/middlewares"

type CartLocaleBody = { locale?: null | string }

const request = (
  locale: string | undefined,
  validatedBody: CartLocaleBody | undefined
) =>
  ({
    locale,
    validatedBody,
  }) as unknown as MedusaRequest<CartLocaleBody>

const runMiddleware = (
  locale: string | undefined,
  validatedBody: CartLocaleBody | undefined
) => {
  const req = request(locale, validatedBody)
  const next = vi.fn()

  bindCartLocaleFromRequest(req, {} as MedusaResponse, next)

  return { next, req }
}

describe("cart locale binding", () => {
  it.each([
    ["cs-CZ", "cs-CZ"],
    ["hu-HU", "hu-HU"],
    ["ro-RO", "ro-RO"],
    ["sk-SK", "sk-SK"],
  ])("binds the %s request locale onto the cart body", (locale, expected) => {
    const body: CartLocaleBody = {}
    const { next } = runMiddleware(locale, body)

    expect(body.locale).toBe(expected)
    expect(next).toHaveBeenCalledOnce()
  })

  it("keeps an explicit body locale", () => {
    const body: CartLocaleBody = { locale: "ro-RO" }
    runMiddleware("cs-CZ", body)

    expect(body.locale).toBe("ro-RO")
  })

  it.each([
    ["a missing request locale", undefined],
    ["a blank request locale", "   "],
  ])("leaves the cart body untouched for %s", (_label, locale) => {
    const body: CartLocaleBody = {}
    const { next } = runMiddleware(locale, body)

    expect(body.locale).toBeUndefined()
    expect(next).toHaveBeenCalledOnce()
  })

  it("continues when no validated body is present", () => {
    const { next } = runMiddleware("ro-RO", undefined)

    expect(next).toHaveBeenCalledOnce()
  })

  it("binds the locale on cart creation and cart update", () => {
    const matchers = storeCartsMiddlewares
      .filter(({ middlewares }) =>
        middlewares?.includes(bindCartLocaleFromRequest)
      )
      .map(({ matcher }) => matcher)

    expect(matchers).toEqual(["/store/carts", "/store/carts/:id"])
  })
})
