import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/storefront/ssr/context", () => ({
  getRegionServerContext: vi.fn(
    async ({ marketContext }: { marketContext: { code: string } }) => ({
      marketContext,
      region: {
        country_code: marketContext.code,
        currency_code: marketContext.code === "sk" ? "EUR" : "RON",
        region_id: `reg_${marketContext.code}`,
        salesChannelId: `sc_${marketContext.code}`,
      },
    })
  ),
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
        storefront_region_id: "reg_ro",
        storefront_sales_channel_id: "sc_ro",
        storefront_shop_namespace: "herbatica",
      },
    })
  })

  it("rejects an unknown storefront host before creating an identity", async () => {
    const medusaFetch = vi.fn()
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
          host: "unknown.example",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(medusaFetch).not.toHaveBeenCalled()
  })
})
