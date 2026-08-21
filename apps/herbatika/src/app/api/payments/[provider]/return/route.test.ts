import { afterEach, describe, expect, it, vi } from "vitest"
import { CART_SESSION_COOKIE_NAME } from "@/app/api/storefront/checkout/_lib"
import { PAYMENT_RESULT_COOKIE_NAME } from "@/lib/storefront/payment-result-session"
import { buildPath } from "@/lib/url/public-url"
import { GET } from "./route"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string) => {
    const markets = {
      "herbatica.cz": ["cz", "CZ", "cs-CZ"],
      "herbatica.hu": ["hu", "HU", "hu-HU"],
      "herbatica.ro": ["ro", "RO", "ro-RO"],
      "herbatica.sk": ["sk", "SK", "sk-SK"],
    } as const
    const market = markets[host as keyof typeof markets]
    return market
      ? {
          acceptedHosts: [host],
          canonicalOrigin: `https://${host}`,
          countryCode: market[1],
          locale: market[2],
          market: market[0],
          publishableApiKey: `pk_${market[0]}`,
          publishableApiKeyId: `pak_${market[0]}`,
          regionId: `reg_${market[0]}`,
          salesChannelId: `sc_${market[0]}`,
        }
      : null
  }),
}))

const STATE = "OpaqueState"
const RESULT_TOKEN = "r".repeat(43)
const callbackRequest = (query = "", host = "herbatica.cz") =>
  new Request(
    `https://${host}/api/payments/gopay/return?state=${STATE}&cart_id=cart_Case&provider_id=pp_paykit_gopay${query}`,
    {
      headers: {
        cookie: `${CART_SESSION_COOKIE_NAME}=SignedCartSession`,
        host,
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

  it.each([
    ["herbatica.sk", "Výsledok platby sa nenašiel."],
    ["herbatica.cz", "Výsledek platby nebyl nalezen."],
    ["herbatica.hu", "A fizetés eredménye nem található."],
    ["herbatica.ro", "Rezultatul plății nu a fost găsit."],
  ] as const)("localizes rejected callbacks for %s", async (host, message) => {
    const response = await GET(callbackRequest("&unexpected=true", host), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ message })
  })

  it("returns a generic 421 for an unknown Host", async () => {
    const response = await GET(callbackRequest("", "unknown.example"), {
      params: Promise.resolve({ provider: "gopay" }),
    })

    expect(response.status).toBe(421)
    await expect(response.json()).resolves.toEqual({
      message: "Unknown storefront host.",
    })
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
