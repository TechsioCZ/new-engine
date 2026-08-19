import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  broadcastLogout: vi.fn(),
  clearToken: vi.fn(),
  confirmAccountDeactivation: vi.fn(async () => ({
    auth_identity_deleted: true,
    customer_id: "cus_1",
    deleted: true,
  })),
  directSdkLogout: vi.fn(),
  getCustomer: vi.fn(),
  requestLogoutProxy: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  setToken: vi.fn(),
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
  authTokenStorage: {
    clear: mocks.clearToken,
    get: vi.fn(() => null),
    set: vi.fn(),
  },
  broadcastAuthSessionLogout: mocks.broadcastLogout,
  isSessionProxyAuthMode: true,
  storefrontSdk: {
    client: { setToken: mocks.setToken },
  },
}))

vi.mock("./proxy", () => ({
  requestAuthProxy: vi.fn(),
  requestLogoutProxy: mocks.requestLogoutProxy,
  requestSessionProxy: vi.fn(),
}))

import { authService } from "./service"

describe("storefront auth transport", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestLogoutProxy.mockResolvedValue(undefined)
  })

  it("logs out through the same-origin auth proxy without calling SDK auth", async () => {
    await authService.logout()

    expect(mocks.requestLogoutProxy).toHaveBeenCalledOnce()
    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
    expect(mocks.clearToken).toHaveBeenCalledOnce()
    expect(mocks.broadcastLogout).toHaveBeenCalledOnce()
  })

  it("clears local auth state when the logout proxy fails", async () => {
    mocks.requestLogoutProxy.mockRejectedValueOnce(new Error("proxy failed"))

    await expect(authService.logout()).rejects.toThrow("proxy failed")

    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
    expect(mocks.clearToken).toHaveBeenCalledOnce()
    expect(mocks.broadcastLogout).toHaveBeenCalledOnce()
  })

  it("cleans up a deactivated session through the proxy only", async () => {
    await authService.confirmAccountDeactivation({ token: "opaque-token" })

    expect(mocks.confirmAccountDeactivation).toHaveBeenCalledWith({
      token: "opaque-token",
    })
    expect(mocks.requestLogoutProxy).toHaveBeenCalledOnce()
    expect(mocks.directSdkLogout).not.toHaveBeenCalled()
    expect(mocks.clearToken).toHaveBeenCalledOnce()
    expect(mocks.broadcastLogout).toHaveBeenCalledOnce()
  })
})
