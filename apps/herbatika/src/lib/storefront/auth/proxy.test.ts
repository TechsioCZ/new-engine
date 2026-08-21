import { afterEach, describe, expect, it, vi } from "vitest"
import { requestAuthProxy, requestSessionProxy } from "./proxy"

describe("storefront auth browser response mapping", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("accepts an authenticated user payload without a browser token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          authenticated: true,
          user: { email: "customer@example.test", id: "cus_1" },
        })
      )
    )

    await expect(
      requestAuthProxy("login", {
        email: "customer@example.test",
        password: "correct-password",
      })
    ).resolves.toEqual({
      authenticated: true,
      user: { email: "customer@example.test", id: "cus_1" },
    })
  })

  it("rejects the removed token-only compatibility payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ token: "browser-jwt" }))
    )

    await expect(
      requestAuthProxy("login", {
        email: "customer@example.test",
        password: "correct-password",
      })
    ).rejects.toThrow("nevrátilo používateľa")
  })

  it("restores the UI customer without accepting or returning a token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          authenticated: true,
          token: "must-be-ignored",
          user: { id: "cus_1" },
        })
      )
    )

    const session = await requestSessionProxy()

    expect(session).toEqual({ authenticated: true, user: { id: "cus_1" } })
    expect(session).not.toHaveProperty("token")
  })
})
