import { beforeEach, describe, expect, it } from "vitest"
import type {
  MarketCode,
  MarketRuntimeBinding,
} from "@/lib/market/market-runtime"
import {
  CHECKOUT_CONSENT_COOKIE_NAME,
  CHECKOUT_CONSENT_POLICY_VERSION,
  CHECKOUT_CONSENT_VERSION,
} from "@/lib/storefront/checkout-consent"
import {
  handleCheckoutConsentGet,
  handleCheckoutConsentPut,
  parseCheckoutConsentRequest,
} from "./route"

const testContext: { market: MarketCode } = { market: "sk" }
const NOW = new Date("2026-08-21T00:00:00.000Z")

const dependencies = {
  hasSameOrigin: (incomingRequest: Request) =>
    incomingRequest.headers.get("origin") ===
    `https://herbatica.${testContext.market}`,
  now: () => NOW,
  requireBinding: () =>
    ({
      canonicalOrigin: `https://herbatica.${testContext.market}`,
      market: testContext.market,
    }) as MarketRuntimeBinding,
}

const body = (heureka: boolean, marketing: boolean) => ({
  policyVersion: CHECKOUT_CONSENT_POLICY_VERSION,
  purposes: { heureka, marketing },
  version: CHECKOUT_CONSENT_VERSION,
})

const createRequest = (
  method: "GET" | "PUT",
  options: { body?: unknown; cookie?: string; origin?: string } = {}
) =>
  new Request(
    `https://herbatica.${testContext.market}/api/storefront/checkout/preferences`,
    {
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        host: `herbatica.${testContext.market}`,
        ...(options.cookie ? { cookie: options.cookie } : {}),
        ...(options.origin ? { origin: options.origin } : {}),
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
      },
      method,
    }
  )

describe("checkout consent preferences route", () => {
  beforeEach(() => {
    testContext.market = "sk"
  })

  it("returns a denied, private four-market default without setting a cookie", async () => {
    for (const market of ["sk", "cz", "hu", "ro"] as const) {
      testContext.market = market
      const response = handleCheckoutConsentGet(
        createRequest("GET"),
        dependencies
      )

      expect(response.status).toBe(200)
      expect(response.headers.get("cache-control")).toBe("private, no-store")
      expect(response.headers.get("vary")).toBe("Host, Cookie")
      expect(response.headers.get("set-cookie")).toBeNull()
      await expect(response.json()).resolves.toMatchObject({
        market,
        purposes: { heureka: false, marketing: false },
      })
    }
  })

  it("sets one Secure HttpOnly host-only cookie for exact same-origin input", async () => {
    const response = await handleCheckoutConsentPut(
      createRequest("PUT", {
        body: body(true, false),
        origin: "https://herbatica.sk",
      }),
      dependencies
    )
    const setCookie = response.headers.get("set-cookie") ?? ""

    expect(response.status).toBe(200)
    expect(setCookie).toContain(`${CHECKOUT_CONSENT_COOKIE_NAME}=`)
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("Secure")
    expect(setCookie).toContain("SameSite=lax")
    expect(setCookie).toContain("Path=/")
    expect(setCookie).not.toContain("Domain=")
    expect(
      setCookie.match(new RegExp(CHECKOUT_CONSENT_COOKIE_NAME, "g"))
    ).toHaveLength(1)
  })

  it("rejects cross-origin, extra input, old policy, and unapproved Heureka", async () => {
    expect(
      (
        await handleCheckoutConsentPut(
          createRequest("PUT", {
            body: body(false, true),
            origin: "https://attacker.example",
          }),
          dependencies
        )
      ).status
    ).toBe(403)

    expect(
      parseCheckoutConsentRequest({ ...body(false, true), extra: true })
    ).toBeNull()
    expect(
      parseCheckoutConsentRequest({
        ...body(false, true),
        policyVersion: "old",
      })
    ).toBeNull()

    testContext.market = "ro"
    expect(
      (
        await handleCheckoutConsentPut(
          createRequest("PUT", {
            body: body(true, false),
            origin: "https://herbatica.ro",
          }),
          dependencies
        )
      ).status
    ).toBe(400)
  })

  it("fails closed on duplicate consent cookies", async () => {
    const first = await handleCheckoutConsentPut(
      createRequest("PUT", {
        body: body(true, true),
        origin: "https://herbatica.sk",
      }),
      dependencies
    )
    const cookie = first.headers.get("set-cookie")?.split(";")[0]
    const response = handleCheckoutConsentGet(
      createRequest("GET", { cookie: `${cookie}; ${cookie}` }),
      dependencies
    )

    await expect(response.json()).resolves.toMatchObject({
      purposes: { heureka: false, marketing: false },
    })
  })
})
