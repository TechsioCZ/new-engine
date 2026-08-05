import type { HttpTypes } from "@medusajs/types"
import { vi, describe, expect, it } from "vitest"

import {
  MedusaRegistrationSignInError,
  createMedusaAuthService,
} from "../src/auth/medusa-service"

interface SdkLike {
  client: {
    fetch: ReturnType<typeof vi.fn>
  }
  auth: {
    register: ReturnType<typeof vi.fn>
    login: ReturnType<typeof vi.fn>
    refresh: ReturnType<typeof vi.fn>
    logout: ReturnType<typeof vi.fn>
  }
  store: {
    customer: {
      retrieve: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }
}

function createSdkMock(overrides?: {
  logout?: SdkLike["auth"]["logout"]
  createCustomer?: SdkLike["store"]["customer"]["create"]
  fetchCustomer?: SdkLike["client"]["fetch"]
}): SdkLike {
  return {
    auth: {
      login: vi.fn().mockResolvedValue("token_1"),
      logout: overrides?.logout ?? vi.fn().mockResolvedValue(undefined),
      refresh: vi.fn().mockResolvedValue("token_2"),
      register: vi.fn().mockResolvedValue("token_1"),
    },
    client: {
      fetch:
        overrides?.fetchCustomer ??
        vi.fn().mockResolvedValue({
          customer: { id: "cus_1" } as HttpTypes.StoreCustomer,
        }),
    },
    store: {
      customer: {
        create:
          overrides?.createCustomer ??
          vi.fn().mockResolvedValue({
            customer: { id: "cus_1" } as HttpTypes.StoreCustomer,
          }),
        retrieve: vi.fn().mockResolvedValue({
          customer: { id: "cus_1" } as HttpTypes.StoreCustomer,
        }),
        update: vi.fn().mockResolvedValue({
          customer: { id: "cus_1" } as HttpTypes.StoreCustomer,
        }),
      },
    },
  }
}

describe(createMedusaAuthService, () => {
  it("forwards AbortSignal in getCustomer and sorts addresses by creation time", async () => {
    const sdk = createSdkMock({
      fetchCustomer: vi.fn().mockResolvedValue({
        customer: {
          addresses: [
            { id: "addr_2", created_at: "2026-02-21T12:00:00.000Z" },
            { id: "addr_1", created_at: "2026-02-21T10:00:00.000Z" },
          ],
          id: "cus_1",
        } as HttpTypes.StoreCustomer,
      }),
    })
    const service = createMedusaAuthService(sdk as never)
    const controller = new AbortController()

    const customer = await service.getCustomer(controller.signal)

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/customers/me", {
      signal: controller.signal,
    })
    expect(customer?.addresses?.map((address) => address.id)).toStrictEqual([
      "addr_1",
      "addr_2",
    ])
  })

  it("returns null from getCustomer on auth errors", async () => {
    const sdk = createSdkMock({
      fetchCustomer: vi.fn().mockRejectedValue({ status: 401 }),
    })
    const service = createMedusaAuthService(sdk as never)

    await expect(service.getCustomer()).resolves.toBeNull()
  })

  it("returns refreshed token from register flow and forwards login token to refresh", async () => {
    const sdk = createSdkMock()
    sdk.auth.register.mockResolvedValue("registration_token")
    sdk.auth.login.mockResolvedValue("login_token")
    sdk.auth.refresh.mockResolvedValue("session_token")
    const service = createMedusaAuthService(sdk as never)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      })
    ).resolves.toBe("session_token")

    expect(sdk.auth.register).toHaveBeenCalledOnce()
    expect(sdk.auth.login).toHaveBeenCalledOnce()
    expect(sdk.store.customer.create).toHaveBeenCalledOnce()
    expect(sdk.auth.refresh).toHaveBeenCalledWith({
      Authorization: "Bearer login_token",
    })
    expect(sdk.auth.register.mock.invocationCallOrder[0]!).toBeLessThan(
      sdk.auth.login.mock.invocationCallOrder[0]!
    )
    expect(sdk.auth.login.mock.invocationCallOrder[0]!).toBeLessThan(
      sdk.store.customer.create.mock.invocationCallOrder[0]!
    )
    expect(sdk.store.customer.create.mock.invocationCallOrder[0]!).toBeLessThan(
      sdk.auth.refresh.mock.invocationCallOrder[0]!
    )
  })

  it("cleans up and rejects when register requires multi-step auth", async () => {
    const sdk = createSdkMock()
    sdk.auth.register.mockResolvedValue({
      location: "https://idp.example.test",
    })
    const service = createMedusaAuthService(sdk as never)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      })
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(sdk.auth.login).not.toHaveBeenCalled()
    expect(sdk.store.customer.create).not.toHaveBeenCalled()
    expect(sdk.auth.refresh).not.toHaveBeenCalled()
    expect(sdk.auth.logout).toHaveBeenCalledOnce()
  })

  it("cleans up and rejects when register login requires multi-step auth", async () => {
    const sdk = createSdkMock()
    sdk.auth.login.mockResolvedValue({ location: "https://idp.example.test" })
    const service = createMedusaAuthService(sdk as never)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      })
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(sdk.store.customer.create).not.toHaveBeenCalled()
    expect(sdk.auth.refresh).not.toHaveBeenCalled()
    expect(sdk.auth.logout).toHaveBeenCalledOnce()
  })

  it("logs logout errors by default and rethrows logout failures", async () => {
    const logoutError = new Error("logout failed")
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const sdk = createSdkMock({
      logout: vi.fn().mockRejectedValue(logoutError),
    })
    const service = createMedusaAuthService(sdk as never)

    await expect(service.logout()).rejects.toBe(logoutError)

    expect(warnSpy).toHaveBeenCalledWith(
      "[storefront-data/auth] Failed to logout customer session.",
      logoutError
    )
  })

  it("calls custom logout reporter and rethrows logout failures", async () => {
    const logoutError = new Error("logout failed")
    const onLogoutError = vi.fn()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const sdk = createSdkMock({
      logout: vi.fn().mockRejectedValue(logoutError),
    })
    const service = createMedusaAuthService(sdk as never, { onLogoutError })

    await expect(service.logout()).rejects.toBe(logoutError)

    expect(onLogoutError).toHaveBeenCalledWith(logoutError, "logout")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("keeps logout as best effort for auth errors (already logged out)", async () => {
    const logoutError = { status: 401 }
    const onLogoutError = vi.fn()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const sdk = createSdkMock({
      logout: vi.fn().mockRejectedValue(logoutError),
    })
    const service = createMedusaAuthService(sdk as never, { onLogoutError })

    await expect(service.logout()).resolves.toBeUndefined()

    expect(onLogoutError).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("reports cleanup logout errors and rethrows original register failure", async () => {
    const registerError = new Error("customer create failed")
    const cleanupLogoutError = new Error("cleanup logout failed")
    const onLogoutError = vi.fn()
    const sdk = createSdkMock({
      createCustomer: vi.fn().mockRejectedValue(registerError),
      logout: vi.fn().mockRejectedValue(cleanupLogoutError),
    })
    const service = createMedusaAuthService(sdk as never, { onLogoutError })

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      })
    ).rejects.toBe(registerError)

    expect(onLogoutError).toHaveBeenCalledWith(
      cleanupLogoutError,
      "register-cleanup"
    )
    expect(sdk.auth.logout).toHaveBeenCalledOnce()
  })

  it("does not report benign auth errors during register cleanup logout", async () => {
    const logoutError = { status: 401 }
    const onLogoutError = vi.fn()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const sdk = createSdkMock({
      logout: vi.fn().mockRejectedValue(logoutError),
    })
    sdk.auth.login.mockResolvedValue({ location: "https://idp.example.test" })
    const service = createMedusaAuthService(sdk as never, { onLogoutError })

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      })
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(onLogoutError).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(sdk.auth.logout).toHaveBeenCalledOnce()
  })

  it("surfaces refresh failures after customer creation as sign-in errors", async () => {
    const refreshError = new Error("refresh failed")
    const sdk = createSdkMock()
    sdk.auth.register.mockResolvedValue("registration_token")
    sdk.auth.login.mockResolvedValue("login_token")
    sdk.auth.refresh.mockRejectedValue(refreshError)
    const service = createMedusaAuthService(sdk as never)
    const registration = service.register({
      email: "john@example.com",
      password: "secret123",
    })

    await expect(registration).rejects.toStrictEqual(
      expect.objectContaining({
        code: "registration_sign_in_failed",
        email: "john@example.com",
        name: "MedusaRegistrationSignInError",
        reason: refreshError,
      })
    )

    await expect(registration).rejects.toBeInstanceOf(
      MedusaRegistrationSignInError
    )
    expect(sdk.store.customer.create).toHaveBeenCalledOnce()
    expect(sdk.auth.logout).toHaveBeenCalledOnce()
  })
})
