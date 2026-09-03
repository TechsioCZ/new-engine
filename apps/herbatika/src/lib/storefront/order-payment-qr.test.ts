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
      expectedCurrencyCode: "CZK",
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

    await fetchOrderPaymentQr({
      expectedCurrencyCode: "CZK",
      orderId: "order_Case",
    })

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

  it.each([
    "EUR",
    "CZK",
    "HUF",
    "RON",
  ] as const)("maps a QR response only for the exact %s market currency", async (currencyCode) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          qr_payment: {
            amount: 123.45,
            currency_code: currencyCode.toLowerCase(),
            iban: "CZ6508000000192000145399",
            order_display_id: "42",
            order_id: "order_Case",
            provider_id: "pp_qr_manual_default",
            qr_svg: "<svg />",
            spayd: `SPD*1.0*ACC:CZ6508000000192000145399*AM:123.45*CC:${currencyCode}*X-VS:42`,
          },
          status: "ready",
        })
      )
    )

    await expect(
      fetchOrderPaymentQr({
        expectedCurrencyCode: currencyCode,
        orderId: "order_Case",
      })
    ).resolves.toMatchObject({
      qrPayment: { currencyCode },
      status: "ready",
    })
  })

  it.each([
    ["missing response currency", null, "CC:CZK"],
    ["missing SPAYD currency", "CZK", "MSG:ORDER 42"],
    ["foreign response currency", "EUR", "CC:CZK"],
    ["foreign SPAYD currency", "CZK", "CC:EUR"],
    ["ambiguous SPAYD currency", "CZK", "CC:CZK*CC:CZK"],
  ] as const)("fails closed for %s", async (_name, responseCurrencyCode, spaydCurrencyField) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          qr_payment: {
            amount: 123.45,
            currency_code: responseCurrencyCode,
            iban: "CZ6508000000192000145399",
            order_id: "order_Case",
            provider_id: "pp_qr_manual_default",
            qr_svg: "<svg />",
            spayd: `SPD*1.0*ACC:CZ6508000000192000145399*AM:123.45*${spaydCurrencyField}*X-VS:42`,
          },
          status: "ready",
        })
      )
    )

    await expect(
      fetchOrderPaymentQr({
        expectedCurrencyCode: "CZK",
        orderId: "order_Case",
      })
    ).resolves.toEqual({ qrPayment: null, status: "unavailable" })
  })
})
