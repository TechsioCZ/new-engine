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

  it("ignores the removed jwt_localstorage mode without touching localStorage", async () => {
    const localStorage = {
      clear: vi.fn(() => {
        throw new Error("localStorage.clear must not be called")
      }),
      getItem: vi.fn(() => {
        throw new Error("localStorage.getItem must not be called")
      }),
      key: vi.fn(() => null),
      length: 0,
      removeItem: vi.fn(() => {
        throw new Error("localStorage.removeItem must not be called")
      }),
      setItem: vi.fn(() => {
        throw new Error("localStorage.setItem must not be called")
      }),
    } satisfies Storage
    vi.stubGlobal("location", { origin: "https://herbatica.sk" })
    vi.stubGlobal("localStorage", localStorage)
    vi.stubEnv("NEXT_PUBLIC_STOREFRONT_AUTH_MODE", "jwt_localstorage")

    const { storefrontConfig } = await import("./sdk")

    expect(storefrontConfig.backendUrl).toBe(
      "https://herbatica.sk/api/storefront-medusa"
    )
    expect(localStorage.getItem).not.toHaveBeenCalled()
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(localStorage.removeItem).not.toHaveBeenCalled()
  }, 10_000)
})
