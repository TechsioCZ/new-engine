import { afterEach, describe, expect, it, vi } from "vitest"

describe("browser storefront SDK authority", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("uses only the fixed same-origin gateway and contains no publishable key", async () => {
    vi.stubGlobal("location", { origin: "https://herbatica.ro" })
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "pk_attacker")

    const { storefrontConfig } = await import("./sdk")

    expect(storefrontConfig).toEqual({
      backendUrl: "https://herbatica.ro/api/storefront-medusa",
    })
    expect(storefrontConfig).not.toHaveProperty("publishableKey")
  }, 10_000)
})
