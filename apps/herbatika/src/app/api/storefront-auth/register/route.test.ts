import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn(() => ({
    acceptedHosts: ["herbatica.ro"],
    canonicalOrigin: "https://herbatica.ro",
    countryCode: "RO",
    locale: "ro-RO",
    market: "ro",
    publishableApiKey: "pk_ro",
    publishableApiKeyId: "pkid_ro",
    regionId: "reg_ro",
    salesChannelId: "sc_ro",
  })),
}))

import { POST } from "./route"

describe("register route", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("stores the market resolved from the public storefront host", async () => {
    const medusaFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json({ token: "login-token" }, { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({ token: "session-token" }, { status: 200 })
      )
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/register", {
        body: JSON.stringify({
          email: "customer@example.test",
          first_name: "Test",
          last_name: "Customer",
          password: "test-password",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
          "x-forwarded-host": "herbatika.internal",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ token: "session-token" })
    expect(medusaFetch).toHaveBeenCalledTimes(4)

    const [url, init] = medusaFetch.mock.calls[2] as [string, RequestInit]
    expect(new URL(url).pathname).toBe("/store/customers")
    expect(JSON.parse(String(init.body))).toMatchObject({
      email: "customer@example.test",
      metadata: {
        storefront_market_code: "ro",
      },
    })
  })

  it("forces the Romanian wholesale company currency to RON", async () => {
    const medusaFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
      .mockResolvedValueOnce(
        Response.json({ token: "login-token" }, { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({ token: "session-token" }, { status: 200 })
      )
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/register", {
        body: JSON.stringify({
          email: "wholesale@example.test",
          password: "test-password",
          wholesale: {
            company_name: "Companie Demo SRL",
            company_identifier: "RO12345678",
            currency_code: "EUR",
            billing_address: {
              address_1: "Strada Demo 1",
              city: "București",
              country_code: "ro",
              postal_code: "010101",
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    expect(medusaFetch).toHaveBeenCalledTimes(5)

    const [url, init] = medusaFetch.mock.calls[4] as [string, RequestInit]
    expect(new URL(url).pathname).toBe("/store/companies")
    expect(JSON.parse(String(init.body))).toMatchObject({
      currency_code: "ron",
      country: "ro",
      name: "Companie Demo SRL",
    })
  })

  it("returns exact Romanian wholesale validation copy before Medusa calls", async () => {
    const medusaFetch = vi.fn()
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/register", {
        body: JSON.stringify({
          email: "wholesale@example.test",
          password: "test-password",
          wholesale: {},
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: "Numele companiei este obligatoriu.",
    })
    expect(medusaFetch).not.toHaveBeenCalled()
  })

  it("returns the exact Romanian email conflict for wholesale accounts", async () => {
    const medusaFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 409 }))
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/register", {
        body: JSON.stringify({
          email: "existing@example.test",
          password: "test-password",
          wholesale: {
            company_name: "Companie Demo SRL",
            company_identifier: "RO12345678",
            billing_address: {
              address_1: "Strada Demo 1",
              city: "București",
              country_code: "ro",
              postal_code: "010101",
            },
          },
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      message:
        "Există deja un cont cu această adresă de e-mail. Autentificați-vă sau folosiți recuperarea parolei.",
    })
    expect(medusaFetch).toHaveBeenCalledOnce()
  })
})
