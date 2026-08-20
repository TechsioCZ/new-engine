import { afterEach, describe, expect, it, vi } from "vitest"
import { CART_SESSION_COOKIE_NAME } from "@/app/api/storefront/checkout/_lib"
import { PAYMENT_RESULT_COOKIE_NAME } from "@/lib/storefront/payment-result-session"
import { buildPath } from "@/lib/url/public-url"
import { GET } from "./route"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string) =>
    host === "herbatica.cz"
      ? {
          acceptedHosts: ["herbatica.cz"],
          canonicalOrigin: "https://herbatica.cz",
          countryCode: "CZ",
          locale: "cs-CZ",
          market: "cz",
          publishableApiKey: "pk_cz",
          publishableApiKeyId: "pak_cz",
          regionId: "reg_cz",
          salesChannelId: "sc_cz",
        }
      : null
  ),
}))

const STATE = "OpaqueState"
const RESULT_TOKEN = "r".repeat(43)
const callbackRequest = (query = "") =>
  new Request(
    `https://herbatica.cz/api/payments/gopay/return?state=${STATE}&cart_id=cart_Case&provider_id=pp_paykit_gopay${query}`,
    {
      headers: {
        cookie: `${CART_SESSION_COOKIE_NAME}=SignedCartSession`,
        host: "herbatica.cz",
      },
    }
  )

describe("GET /api/payments/[provider]/return", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("validates upstream state and redirects 303 with only a result cookie", async () => {
    const upstreamFetch = vi.fn().mockResolvedValue(
      Response.json({
        cart_id: "cart_Case",
        payment_session_id: "payses_Case",
        provider_id: "pp_paykit_gopay",
        result_token: RESULT_TOKEN,
        status: "authorized",
      })
    )
    vi.stubGlobal("fetch", upstreamFetch)

    const response = await GET(callbackRequest(), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      `https://herbatica.cz${buildPath(
        { kind: "checkout", step: "checkoutResult" },
        "cz"
      )}`
    )
    expect(response.headers.get("location")).not.toContain(STATE)
    expect(response.headers.get("location")).not.toContain("cart_Case")
    expect(response.headers.get("set-cookie")).toContain(
      `${PAYMENT_RESULT_COOKIE_NAME}=${RESULT_TOKEN}`
    )
    expect(response.headers.get("set-cookie")).toContain("HttpOnly")
    expect(response.headers.get("set-cookie")).toContain("Secure")

    const [, init] = upstreamFetch.mock.calls[0] as [string, RequestInit]
    expect(init.headers).toMatchObject({
      "x-cart-session": "SignedCartSession",
      "x-publishable-api-key": "pk_cz",
    })
    expect(JSON.parse(String(init.body))).toEqual({
      cart_id: "cart_Case",
      provider_id: "pp_paykit_gopay",
      state: STATE,
    })
  })

  it("fails closed on duplicate, extra, or provider-mismatched input", async () => {
    const upstreamFetch = vi.fn()
    vi.stubGlobal("fetch", upstreamFetch)

    for (const request of [
      callbackRequest("&state=duplicate"),
      callbackRequest("&cancelled=true"),
    ]) {
      const response = await GET(request, {
        params: Promise.resolve({ provider: "gopay" }),
      })
      expect(response.status).toBe(404)
    }

    const mismatch = await GET(callbackRequest(), {
      params: Promise.resolve({ provider: "stripe" }),
    })
    expect(mismatch.status).toBe(404)

    const duplicateCookie = callbackRequest()
    duplicateCookie.headers.set(
      "cookie",
      `${CART_SESSION_COOKIE_NAME}=one; ${CART_SESSION_COOKIE_NAME}=two`
    )
    const ambiguousSession = await GET(duplicateCookie, {
      params: Promise.resolve({ provider: "gopay" }),
    })
    expect(ambiguousSession.status).toBe(404)
    expect(upstreamFetch).not.toHaveBeenCalled()
  })

  it("preserves upstream unavailability without leaking state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({}, { status: 503 }))
    )
    const response = await GET(callbackRequest(), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(STATE)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("maps callback timeouts to a generic 503", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"))
    )
    const response = await GET(callbackRequest(), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain(STATE)
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects incoherent terminal result projections", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          cart_id: "cart_Case",
          payment_session_id: "payses_Case",
          provider_id: "pp_paykit_gopay",
          result_token: RESULT_TOKEN,
          status: "completed",
        })
      )
    )
    const response = await GET(callbackRequest(), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(502)
    expect(response.headers.get("set-cookie")).toBeNull()
  })
})
