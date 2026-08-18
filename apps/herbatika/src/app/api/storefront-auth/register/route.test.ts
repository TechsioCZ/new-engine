import { afterEach, describe, expect, it, vi } from "vitest"
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
})
