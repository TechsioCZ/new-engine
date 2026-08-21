import { afterEach, describe, expect, it, vi } from "vitest"
import {
  fetchOrderPaymentQr,
  hasOrderPaymentQrAuthority,
} from "./order-payment-qr"

describe("order payment QR private client", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("sends the exact guest order token only in a POST body", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({
        qr_payment: null,
        status: "not_applicable",
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)

    await fetchOrderPaymentQr({
      orderId: "order_Case",
      orderToken: "Guest.Token-Exact",
    })

    const [url, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("/api/storefront/orders/order_Case/qr-payment")
    expect(url).not.toContain("Guest.Token-Exact")
    expect(init.method).toBe("POST")
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json"
    )
    expect(JSON.parse(String(init.body))).toEqual({
      order_token: "Guest.Token-Exact",
    })
  })

  it("uses an empty private body for customer-cookie ownership", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({
        qr_payment: null,
        status: "not_applicable",
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)

    await fetchOrderPaymentQr({ orderId: "order_Case" })

    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({})
  })

  it.each([
    [{ isAuthenticated: true }, true],
    [{ isAuthenticated: false, orderToken: "Guest.Token-Exact" }, true],
    [{ isAuthenticated: false }, false],
    [{ isAuthenticated: false, orderToken: "" }, false],
    [{ isAuthenticated: false, orderToken: " Guest.Token-Exact" }, false],
  ] as const)("resolves safe read authority for %o", (input, expected) => {
    expect(hasOrderPaymentQrAuthority(input)).toBe(expected)
  })
})
