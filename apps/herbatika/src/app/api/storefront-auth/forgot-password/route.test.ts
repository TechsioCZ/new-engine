import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string | null) =>
    host === "herbatica.ro"
      ? {
          acceptedHosts: ["herbatica.ro"],
          canonicalOrigin: "https://herbatica.ro",
          countryCode: "RO",
          locale: "ro-RO",
          market: "ro",
          publishableApiKey: "pk_ro",
          publishableApiKeyId: "pkid_ro",
          regionId: "reg_ro",
          salesChannelId: "sc_ro",
        }
      : {
          acceptedHosts: ["herbatica.cz"],
          canonicalOrigin: "https://herbatica.cz",
          countryCode: "CZ",
          locale: "cs-CZ",
          market: "cz",
          publishableApiKey: "pk_cz",
          publishableApiKeyId: "pkid_cz",
          regionId: "reg_cz",
          salesChannelId: "sc_cz",
        }
  ),
}))

import { POST } from "./route"

describe("forgot password route", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("forwards the server-resolved storefront market as reset metadata", async () => {
    const medusaFetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/forgot-password", {
        body: JSON.stringify({ email: " customer@example.test " }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.cz",
          "x-forwarded-host": "herbatika.internal",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(202)
    await expect(response.json()).resolves.toEqual({ accepted: true })
    expect(medusaFetch).toHaveBeenCalledOnce()

    const [url, init] = medusaFetch.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe(
      "/auth/customer/emailpass/reset-password"
    )
    expect(JSON.parse(String(init.body))).toEqual({
      identifier: "customer@example.test",
      metadata: {
        storefront_market_code: "cz",
      },
    })
  })

  it("returns the exact Romanian storefront error for an empty email", async () => {
    const response = await POST(
      new Request("http://localhost/api/storefront-auth/forgot-password", {
        body: JSON.stringify({ email: " " }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: "Adresa de e-mail este obligatorie.",
    })
  })
})
