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

describe("login route Romanian localization", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns a private cookie-varying success response without losing the session cookie", async () => {
    const customer = {
      email: "customer@example.test",
      id: "cus_ro",
    }
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ token: "session-token" }, { status: 200 })
        )
        .mockResolvedValueOnce(Response.json({ customer }, { status: 200 }))
    )

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/login", {
        body: JSON.stringify({
          email: "customer@example.test",
          password: "correct-password",
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
    expect(response.headers.get("set-cookie")).toContain(
      "herbatika_auth_session_token=session-token"
    )
    const payload = await response.json()
    expect(payload).toEqual({ authenticated: true, user: customer })
    expect(payload).not.toHaveProperty("token")
    expect(JSON.stringify(payload)).not.toContain("session-token")
  })

  it("localizes invalid credentials and does not surface upstream English", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { message: "Invalid email or password" },
            { status: 401 }
          )
        )
    )

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/login", {
        body: JSON.stringify({
          email: "customer@example.test",
          password: "incorrect",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      message: "Adresa de e-mail sau parola este incorectă.",
    })
  })

  it("never exposes internal fetch failures in the Romanian response", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockRejectedValue(
          new Error("connect ECONNREFUSED http://medusa.internal?token=secret")
        )
    )

    const response = await POST(
      new Request("http://localhost/api/storefront-auth/login", {
        body: JSON.stringify({
          email: "customer@example.test",
          password: "incorrect",
        }),
        headers: {
          "content-type": "application/json",
          host: "herbatica.ro",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(500)
    const body = await response.text()
    expect(JSON.parse(body)).toEqual({
      message: "Conectarea la serviciul de autentificare Medusa a eșuat.",
    })
    expect(body).not.toContain("medusa.internal")
    expect(body).not.toContain("secret")
    expect(body).not.toContain("ECONNREFUSED")
  })

  it("fails closed for an unknown host before parsing the request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/storefront-auth/login", {
        body: "not-json",
        headers: { host: "attacker.example" },
        method: "POST",
      })
    )

    expect(response.status).toBe(421)
    await expect(response.json()).resolves.toEqual({
      message: "Unknown storefront host.",
    })
  })
})
