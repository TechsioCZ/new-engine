import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

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

  it("rejects an unknown storefront host before calling Medusa", async () => {
    const medusaFetch = vi.fn()
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/forgot-password", {
        body: JSON.stringify({ email: "customer@example.test" }),
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
