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
      : null
  ),
}))

import { POST } from "./route"

describe("reset password route Romanian localization", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns a private cookie-varying success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    )

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/reset-password", {
        body: JSON.stringify({
          password: "new-password1",
          token: "valid-token",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    await expect(response.json()).resolves.toEqual({ success: true })
  })

  it("returns exact Romanian validation copy", async () => {
    const response = await POST(
      new Request("http://localhost/api/storefront-auth/reset-password", {
        body: JSON.stringify({ password: "new-password" }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      message: "Tokenul de resetare a parolei este obligatoriu.",
    })
  })

  it("localizes upstream reset errors", async () => {
    const medusaFetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ message: "Invalid token" }, { status: 400 })
      )
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/reset-password", {
        body: JSON.stringify({
          password: "new-password1",
          token: "expired-token",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      message: "Parola nu a putut fi resetată.",
    })
    expect(medusaFetch).toHaveBeenCalledOnce()
    expect(new URL(String(medusaFetch.mock.calls[0]?.[0])).pathname).toBe(
      "/auth/customer/emailpass/reset-password/complete"
    )
    expect(medusaFetch.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        "x-publishable-api-key": "pk_ro",
      },
    })
  })

  it("rejects a weak replacement password before Medusa", async () => {
    const medusaFetch = vi.fn()
    vi.stubGlobal("fetch", medusaFetch)

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/reset-password", {
        body: JSON.stringify({
          password: "new-password",
          token: "valid-token",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    expect(medusaFetch).not.toHaveBeenCalled()
  })
})
