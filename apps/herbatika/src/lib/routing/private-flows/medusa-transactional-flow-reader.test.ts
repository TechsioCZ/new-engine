import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { createMedusaTransactionalFlowReader } from "./medusa-transactional-flow-reader"

const binding: MarketRuntimeBinding = {
  acceptedHosts: ["herbatika.sk"],
  canonicalOrigin: "https://herbatika.sk",
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_sk",
  publishableApiKeyId: "pkid_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const response = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  })

const createReader = (fetch = vi.fn()) => ({
  fetch,
  reader: createMedusaTransactionalFlowReader({
    baseUrl: "http://medusa.internal:9000",
    fetch,
    resolveMarket: (market) => (market === "sk" ? binding : null),
  }),
})

describe("Medusa transactional-flow reader", () => {
  it("validates a customer-owned confirmation without exposing the token in the URL", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { order: { id: "order_CASE" } }))
    const { reader } = createReader(fetch)

    await expect(
      reader.readOrderConfirmation("sk", {
        customerToken: "Customer.JWT",
        orderId: "order_CASE",
      })
    ).resolves.toEqual({
      kind: "found",
      value: { order: { id: "order_CASE" } },
    })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.pathname).toBe("/store/order-confirmations/resolve")
    expect(url.search).toBe("")
    expect(init.headers).toEqual(
      expect.objectContaining({ authorization: "Bearer Customer.JWT" })
    )
    expect(JSON.parse(String(init.body))).toEqual({
      public_order_id: "order_CASE",
    })
  })

  it("sends an exact guest order token only in the request body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { order: { id: "order_CASE" } }))
    const { reader } = createReader(fetch)

    await reader.readOrderConfirmation("sk", {
      orderId: "order_CASE",
      orderToken: "Guest.Token-Exact",
    })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.href).not.toContain("Guest.Token-Exact")
    expect(JSON.parse(String(init.body))).toEqual({
      order_token: "Guest.Token-Exact",
      public_order_id: "order_CASE",
    })
  })

  it("rejects a confirmation response whose ID differs only by case", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { order: { id: "order_case" } }))

    await expect(
      createReader(fetch).reader.readOrderConfirmation("sk", {
        orderId: "order_CASE",
        orderToken: "guest",
      })
    ).resolves.toEqual({ kind: "missing" })
  })

  it("resolves a review product from a usable exact token", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(response(200, { product_id: "prod_1" }))
    const { reader } = createReader(fetch)

    await expect(
      reader.readReviewInvitation("sk", "Review.Token")
    ).resolves.toEqual({ kind: "found", value: { productId: "prod_1" } })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.href).not.toContain("Review.Token")
    expect(JSON.parse(String(init.body))).toEqual({ token: "Review.Token" })
  })

  it("validates reset tokens through an exact bearer header", async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, { valid: true }))
    const { reader } = createReader(fetch)

    await expect(reader.readResetToken("sk", "Reset.Token")).resolves.toEqual({
      kind: "found",
      value: { valid: true },
    })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.href).not.toContain("Reset.Token")
    expect(init.headers).toEqual(
      expect.objectContaining({
        authorization: "Bearer Reset.Token",
        "x-publishable-api-key": "pk_sk",
      })
    )
  })

  it("validates an exact deactivation token without mutating the account", async () => {
    const fetch = vi.fn().mockResolvedValue(response(200, { valid: true }))
    const { reader } = createReader(fetch)

    await expect(
      reader.readDeactivationToken("sk", "Deactivate.Token")
    ).resolves.toEqual({ kind: "found", value: { valid: true } })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.pathname).toBe("/store/customers/deactivate/validate")
    expect(url.href).not.toContain("Deactivate.Token")
    expect(JSON.parse(String(init.body))).toEqual({ token: "Deactivate.Token" })
  })

  it("resolves an HttpOnly payment-result handoff without exposing its bearer", async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        cart_id: "cart_CASE",
        payment_session_id: "payses_CASE",
        provider_id: "pp_paykit_stripe",
        public_order_id: "order_CASE",
        status: "completed",
      })
    )
    const { reader } = createReader(fetch)

    await expect(
      reader.readPaymentResult("sk", {
        cartSessionToken: "Signed.Cart.Session",
        resultToken: "Opaque.Result.Bearer",
      })
    ).resolves.toEqual({
      kind: "found",
      value: {
        cartId: "cart_CASE",
        paymentSessionId: "payses_CASE",
        providerId: "pp_paykit_stripe",
        publicOrderId: "order_CASE",
        status: "completed",
      },
    })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.pathname).toBe("/store/payment-returns/result")
    expect(url.href).not.toContain("Opaque.Result.Bearer")
    expect(init.headers).toEqual(
      expect.objectContaining({ "x-cart-session": "Signed.Cart.Session" })
    )
    expect(JSON.parse(String(init.body))).toEqual({
      result_token: "Opaque.Result.Bearer",
    })
  })

  it.each([
    {
      cart_id: "cart_CASE",
      payment_session_id: "payses_CASE",
      provider_id: "pp_paykit_stripe",
      status: "completed",
    },
    {
      cart_id: "cart_CASE",
      payment_session_id: "payses_CASE",
      provider_id: "pp_paykit_stripe",
      public_order_id: "order_CASE",
      status: "authorized",
    },
    {
      cart_id: "cart_CASE",
      payment_session_id: "payses_CASE",
      provider_id: "pp_paykit_stripe",
      status: "unknown",
    },
  ])("collapses an incoherent payment-result projection to missing", async (payload) => {
    const fetch = vi.fn().mockResolvedValue(response(200, payload))

    await expect(
      createReader(fetch).reader.readPaymentResult("sk", {
        cartSessionToken: "Signed.Cart.Session",
        resultToken: "Opaque.Result.Bearer",
      })
    ).resolves.toEqual({ kind: "missing" })
  })

  it("accepts only a coherent checkout projection", async () => {
    const fetch = vi.fn().mockResolvedValue(
      response(200, {
        cart_id: "cart_1",
        default_step: "shipping",
        invalid_provider_state: false,
        reachable_steps: ["contact", "shipping"],
      })
    )

    await expect(
      createReader(fetch).reader.readCheckoutSession(
        "sk",
        "cart_1",
        "Signed.Token"
      )
    ).resolves.toEqual({
      kind: "found",
      value: {
        cartId: "cart_1",
        defaultStep: "shipping",
        reachableSteps: ["contact", "shipping"],
      },
    })
    const [url, init] = fetch.mock.calls[0] as [URL, RequestInit]
    expect(url.pathname).toBe("/store/cart-session/resolve")
    expect(init.headers).toEqual(
      expect.objectContaining({ "x-cart-session": "Signed.Token" })
    )
    expect(JSON.parse(String(init.body))).toEqual({ cart_id: "cart_1" })
  })

  it.each([
    {
      cart_id: "cart_WRONG",
      default_step: "contact",
      invalid_provider_state: false,
      reachable_steps: ["contact"],
    },
    {
      cart_id: "cart_1",
      default_step: "contact",
      invalid_provider_state: true,
      reachable_steps: ["contact"],
    },
    {
      cart_id: "cart_1",
      default_step: "payment",
      invalid_provider_state: false,
      reachable_steps: ["contact"],
    },
    {
      cart_id: "cart_1",
      default_step: "contact",
      invalid_provider_state: false,
      reachable_steps: ["contact", "contact"],
    },
  ])("rejects an invalid checkout projection", async (payload) => {
    const fetch = vi.fn().mockResolvedValue(response(200, payload))

    await expect(
      createReader(fetch).reader.readCheckoutSession(
        "sk",
        "cart_1",
        "Signed.Token"
      )
    ).resolves.toEqual(
      payload.invalid_provider_state
        ? { kind: "invalid-provider" }
        : { kind: "missing" }
    )
  })

  it.each([
    400, 401, 403, 404, 409, 410,
  ])("collapses unusable secret status %s to missing", async (status) => {
    const fetch = vi.fn().mockResolvedValue(response(status))
    await expect(
      createReader(fetch).reader.readReviewInvitation("sk", "secret")
    ).resolves.toEqual({ kind: "missing" })
  })

  it("maps backend failure and invalid JSON to unavailability", async () => {
    const backendFailure = vi.fn().mockResolvedValue(response(503))
    const invalidJson = vi.fn().mockResolvedValue(
      new Response("not-json", {
        headers: { "content-type": "text/plain" },
        status: 200,
      })
    )

    await expect(
      createReader(backendFailure).reader.readResetToken("sk", "secret")
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 30 })
    await expect(
      createReader(invalidJson).reader.readReviewInvitation("sk", "secret")
    ).resolves.toEqual({ kind: "unavailable", retryAfterSeconds: 30 })
  })

  it("maps invalid market runtime configuration to unavailability", async () => {
    const reader = createMedusaTransactionalFlowReader({
      baseUrl: "http://medusa.internal:9000",
      fetch: vi.fn(),
      resolveMarket: () => {
        throw new Error("invalid runtime")
      },
    })

    await expect(reader.readResetToken("sk", "token")).resolves.toEqual({
      kind: "unavailable",
      retryAfterSeconds: 30,
    })
  })
})
