import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/market/market-runtime.server", () => ({
  resolveConfiguredMarketRuntimeBindingByHost: vi.fn((host: string | null) => {
    if (host === "herbatica.ro") {
      return {
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
    }
    if (host === "herbatica.sk") {
      return {
        acceptedHosts: ["herbatica.sk"],
        canonicalOrigin: "https://herbatica.sk",
        countryCode: "SK",
        locale: "sk-SK",
        market: "sk",
        publishableApiKey: "pk_sk",
        publishableApiKeyId: "pkid_sk",
        regionId: "reg_sk",
        salesChannelId: "sc_sk",
      }
    }
    return null
  }),
}))

import { GET } from "./route"

describe("session route Romanian localization", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns Romanian copy when authentication is required", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: { host: "herbatica.ro" },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    const payload = await response.json()
    expect(payload).toEqual({
      authenticated: false,
      message: "Este necesară autentificarea.",
    })
    expect(payload).not.toHaveProperty("token")
  })

  it("keeps the Slovak session response localized", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: { host: "herbatica.sk" },
      })
    )

    const payload = await response.json()
    expect(payload).toEqual({
      authenticated: false,
      message: "Vyžaduje sa prihlásenie.",
    })
    expect(payload).not.toHaveProperty("token")
  })

  it("returns Romanian copy and clears the cookie for an invalid token", async () => {
    const refreshCancel = vi.fn()
    const customerCancel = vi.fn()
    const medusaFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            cancel: refreshCancel,
            start(controller) {
              controller.enqueue(new TextEncoder().encode("refresh denied"))
            },
          }),
          { status: 401 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          new ReadableStream({
            cancel: customerCancel,
            start(controller) {
              controller.enqueue(new TextEncoder().encode("customer denied"))
            },
          }),
          { status: 401 }
        )
      )
    vi.stubGlobal("fetch", medusaFetch)

    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: {
          cookie: "herbatika_auth_session_token=invalid-token",
          host: "herbatica.ro",
        },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    const payload = await response.json()
    expect(payload).toEqual({
      authenticated: false,
      message: "Este necesară autentificarea.",
    })
    expect(payload).not.toHaveProperty("token")
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    expect(medusaFetch).toHaveBeenCalledTimes(2)
    expect(refreshCancel).toHaveBeenCalledOnce()
    expect(customerCancel).toHaveBeenCalledOnce()
  })

  it("returns a private response and preserves a refreshed session cookie", async () => {
    const customer = { email: "customer@example.test", id: "cus_ro" }
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ token: "refreshed-token" }, { status: 200 })
        )
        .mockResolvedValueOnce(Response.json({ customer }, { status: 200 }))
    )

    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: {
          cookie: "herbatika_auth_session_token=old-token",
          host: "herbatica.ro",
        },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    expect(response.headers.get("set-cookie")).toContain(
      "herbatika_auth_session_token=refreshed-token"
    )
    const payload = await response.json()
    expect(payload).toEqual({ authenticated: true, user: customer })
    expect(payload).not.toHaveProperty("token")
    expect(JSON.stringify(payload)).not.toContain("refreshed-token")
  })

  it("consumes the successful customer body during token fallback", async () => {
    const refreshCancel = vi.fn()
    const customerCancel = vi.fn()
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            new ReadableStream({
              cancel: refreshCancel,
              start(controller) {
                controller.enqueue(new TextEncoder().encode("refresh denied"))
              },
            }),
            { status: 401 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            new ReadableStream({
              cancel: customerCancel,
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode('{"customer":{"id":"cus_ro"}}')
                )
                controller.close()
              },
            }),
            { status: 200 }
          )
        )
    )

    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: {
          cookie: "herbatika_auth_session_token=valid-token",
          host: "herbatica.ro",
        },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    expect(response.headers.get("set-cookie")).toContain(
      "herbatika_auth_session_token=valid-token"
    )
    const payload = await response.json()
    expect(payload).toEqual({
      authenticated: true,
      user: { id: "cus_ro" },
    })
    expect(payload).not.toHaveProperty("token")
    expect(JSON.stringify(payload)).not.toContain("valid-token")
    expect(refreshCancel).toHaveBeenCalledOnce()
    expect(customerCancel).not.toHaveBeenCalled()
  })

  it("returns a Romanian session error without internal exception details", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new Error("connect ECONNREFUSED http://medusa.internal?token=secret")
        )
    )

    const response = await GET(
      new NextRequest("http://localhost/api/storefront-auth/session", {
        headers: {
          cookie: "herbatika_auth_session_token=opaque-token",
          host: "herbatica.ro",
        },
      })
    )

    expect(response.status).toBe(500)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({
      message: "Sesiunea de autentificare nu a putut fi restabilită.",
    })
    expect(body).not.toContain("medusa.internal")
    expect(body).not.toContain("secret")
  })
})
