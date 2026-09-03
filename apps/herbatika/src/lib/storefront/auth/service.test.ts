import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  confirmAccountDeactivation: vi.fn(async () => ({
    auth_identity_deleted: true,
    customer_id: "cus_1",
    deleted: true,
  })),
  directSdkLogout: vi.fn(),
  getCustomer: vi.fn(),
  requestAuthProxy: vi.fn(),
  requestLogoutProxy: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  requestSessionProxy: vi.fn(),
  updateCustomer: vi.fn(),
}))

vi.mock("@techsio/storefront-data/auth/medusa-service", () => ({
  createMedusaAuthService: () => ({
    confirmAccountDeactivation: mocks.confirmAccountDeactivation,
    getCustomer: mocks.getCustomer,
    logout: mocks.directSdkLogout,
    updateCustomer: mocks.updateCustomer,
  }),
}))

vi.mock("../sdk", () => ({
  storefrontSdk: {},
}))

vi.mock("./proxy", () => ({
  requestAuthProxy: mocks.requestAuthProxy,
  requestLogoutProxy: mocks.requestLogoutProxy,
  requestSessionProxy: mocks.requestSessionProxy,
}))

import { authService } from "./service"

describe("storefront auth transport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestAuthProxy.mockResolvedValue({
      authenticated: true,
      user: { id: "cus_1" },
    })
    mocks.requestLogoutProxy.mockResolvedValue(undefined)
    mocks.requestSessionProxy.mockResolvedValue({
      authenticated: true,
      user: { id: "cus_1" },
    })
  })

  it("logs out through the same-origin auth proxy without calling SDK auth", async () => {
    await authService.logout()

    expect(mocks.requestLogoutProxy).toHaveBeenCalledOnce()
    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
  })

  it("surfaces logout proxy failures without touching browser token storage", async () => {
    mocks.requestLogoutProxy.mockRejectedValueOnce(new Error("proxy failed"))

    await expect(authService.logout()).rejects.toThrow("proxy failed")

    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
  })

  it("cleans up a deactivated session through the proxy only", async () => {
    await authService.confirmAccountDeactivation({ token: "opaque-token" })

    expect(mocks.confirmAccountDeactivation).toHaveBeenCalledWith({
      token: "opaque-token",
    })
    expect(mocks.requestLogoutProxy).toHaveBeenCalledOnce()
    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
  })

  it("loads the authenticated UI customer from the cookie-backed session response", async () => {
    await expect(authService.getCustomer()).resolves.toEqual({ id: "cus_1" })

    expect(mocks.requestSessionProxy).toHaveBeenCalledOnce()
    expect(mocks.getCustomer).not.toHaveBeenCalled()
  })

  it("logs in and registers without reading or writing localStorage", async () => {
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
    vi.stubGlobal("localStorage", localStorage)

    await expect(
      authService.login({
        email: "customer@example.test",
        password: "correct-password",
      })
    ).resolves.toBe("authenticated")
    await expect(
      authService.register({
        email: "customer@example.test",
        password: "correct-password",
      })
    ).resolves.toBe("authenticated")

    expect(localStorage.getItem).not.toHaveBeenCalled()
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(localStorage.removeItem).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
