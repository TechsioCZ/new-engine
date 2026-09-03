import { describe, expect, it, vi } from "vitest"

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

describe("logout route", () => {
  it("returns a private cookie-varying response and preserves the clearing cookie", async () => {
    const response = POST(
      new Request("http://localhost/api/storefront-auth/logout", {
        headers: { host: "herbatica.ro" },
        method: "POST",
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(response.headers.get("vary")).toBe("Cookie")
    expect(response.headers.get("set-cookie")).toContain(
      "herbatika_auth_session_token=;"
    )
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0")
    await expect(response.json()).resolves.toEqual({ ok: true })
  })
})
