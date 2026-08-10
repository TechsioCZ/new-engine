import type Medusa from "@medusajs/js-sdk"
import type { ClientHeaders, FetchArgs } from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { Mock } from "vitest"
import { describe, expect, it, vi } from "vitest"

import type { MedusaLogoutErrorContext } from "../src/auth/medusa-service"
import {
  InvalidMedusaAccountDeactivationResponseError,
  MedusaRegistrationSignInError,
  createMedusaAuthService,
} from "../src/auth/medusa-service"
import {
  createStoreCustomer,
  createStoreCustomerAddress,
  createTestMedusaSdk,
} from "./medusa-fixtures"

type FetchMedusa = <T>(path: string, init?: FetchArgs) => Promise<T>

type RegisterAuth = Medusa["auth"]["register"]

interface AuthRedirect {
  location: string
}

type RegisterAuthMock = (
  ...args: Parameters<RegisterAuth>
) => Promise<string | AuthRedirect>

type LoginAuth = Medusa["auth"]["login"]

type RefreshAuth = (headers?: ClientHeaders) => Promise<string>

type LogoutAuth = () => Promise<void>

type CreateCustomer = (
  body: HttpTypes.StoreCreateCustomer,
) => Promise<HttpTypes.StoreCustomerResponse>

type OnLogoutError = (error: unknown, context: MedusaLogoutErrorContext) => void

interface SdkSpies {
  clientFetch: Mock<FetchMedusa>
  login: Mock<LoginAuth>
  logout: Mock<LogoutAuth>
  refresh: Mock<RefreshAuth>
  register: Mock<RegisterAuthMock>
  storeCustomerCreate: Mock<CreateCustomer>
}

const createSdkMock = () => {
  const sdk = createTestMedusaSdk()
  const spies: SdkSpies = {
    clientFetch: vi.fn<FetchMedusa>().mockResolvedValue({
      customer: createStoreCustomer("cus_1"),
    }),
    login: vi.fn<LoginAuth>().mockResolvedValue("token_1"),
    logout: vi.fn<LogoutAuth>().mockResolvedValue(),
    refresh: vi.fn<RefreshAuth>().mockResolvedValue("token_2"),
    register: vi.fn<RegisterAuthMock>().mockResolvedValue("token_1"),
    storeCustomerCreate: vi.fn<CreateCustomer>().mockResolvedValue({
      customer: createStoreCustomer("cus_1"),
    }),
  }

  Object.defineProperty(sdk.client, "fetch", { value: spies.clientFetch })
  Object.defineProperties(sdk.auth, {
    login: { value: spies.login },
    logout: { value: spies.logout },
    refresh: { value: spies.refresh },
    register: { value: spies.register },
  })
  Object.defineProperty(sdk.store.customer, "create", {
    value: spies.storeCustomerCreate,
  })

  return { sdk, spies }
}

const firstCallOrder = (mock: {
  mock: { invocationCallOrder: number[] }
}): number => {
  const [order] = mock.mock.invocationCallOrder
  if (order === undefined) {
    throw new Error("Expected mock to have recorded at least one call.")
  }
  return order
}

describe(createMedusaAuthService, () => {
  it("forwards AbortSignal in getCustomer and sorts addresses by creation time", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockResolvedValue({
      customer: createStoreCustomer("cus_1", {
        addresses: [
          createStoreCustomerAddress("addr_2", {
            created_at: "2026-02-21T12:00:00.000Z",
          }),
          createStoreCustomerAddress("addr_1", {
            created_at: "2026-02-21T10:00:00.000Z",
          }),
        ],
      }),
    })
    const service = createMedusaAuthService(sdk)
    const controller = new AbortController()

    const customer = await service.getCustomer(controller.signal)

    expect(spies.clientFetch).toHaveBeenCalledWith("/store/customers/me", {
      signal: controller.signal,
    })
    expect(customer?.addresses?.map((address) => address.id)).toStrictEqual([
      "addr_1",
      "addr_2",
    ])
  })

  it("returns null from getCustomer on auth errors", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockRejectedValue({ status: 401 })
    const service = createMedusaAuthService(sdk)

    await expect(service.getCustomer()).resolves.toBeNull()
  })

  it("parses a valid account deactivation request response", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockResolvedValue({ customer_id: "cus_1", sent: true })
    const service = createMedusaAuthService(sdk)
    const { requestAccountDeactivation } = service

    if (requestAccountDeactivation === undefined) {
      throw new Error(
        "Expected the Medusa auth service to support deactivation",
      )
    }

    await expect(requestAccountDeactivation()).resolves.toStrictEqual({
      customer_id: "cus_1",
      sent: true,
    })
    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/customers/me/deactivate",
      {
        body: { confirm: true },
        method: "POST",
      },
    )
  })

  it("rejects a malformed account deactivation request response", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockResolvedValue({ customer_id: "cus_1", sent: "yes" })
    const service = createMedusaAuthService(sdk)
    const { requestAccountDeactivation } = service

    if (requestAccountDeactivation === undefined) {
      throw new Error(
        "Expected the Medusa auth service to support deactivation",
      )
    }

    const request = requestAccountDeactivation()
    await expect(request).rejects.toMatchObject({
      code: "INVALID_MEDUSA_ACCOUNT_DEACTIVATION_RESPONSE",
      field: "sent",
      operation: "request",
    })
    await expect(request).rejects.toBeInstanceOf(
      InvalidMedusaAccountDeactivationResponseError,
    )
  })

  it("parses a valid account deactivation confirmation response", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockResolvedValue({
      auth_identity_deleted: true,
      customer_id: "cus_1",
      deleted: true,
    })
    const service = createMedusaAuthService(sdk)
    const { confirmAccountDeactivation } = service

    if (confirmAccountDeactivation === undefined) {
      throw new Error(
        "Expected the Medusa auth service to support deactivation",
      )
    }

    await expect(
      confirmAccountDeactivation({ token: "deactivation-token" }),
    ).resolves.toStrictEqual({
      auth_identity_deleted: true,
      customer_id: "cus_1",
      deleted: true,
    })
    expect(spies.clientFetch).toHaveBeenCalledWith(
      "/store/customers/deactivate/confirm",
      {
        body: { token: "deactivation-token" },
        method: "POST",
      },
    )
  })

  it("rejects a malformed account deactivation confirmation response", async () => {
    const { sdk, spies } = createSdkMock()
    spies.clientFetch.mockResolvedValue({
      auth_identity_deleted: true,
      customer_id: "cus_1",
      deleted: 1,
    })
    const service = createMedusaAuthService(sdk)
    const { confirmAccountDeactivation } = service

    if (confirmAccountDeactivation === undefined) {
      throw new Error(
        "Expected the Medusa auth service to support deactivation",
      )
    }

    const confirmation = confirmAccountDeactivation({
      token: "deactivation-token",
    })
    await expect(confirmation).rejects.toMatchObject({
      code: "INVALID_MEDUSA_ACCOUNT_DEACTIVATION_RESPONSE",
      field: "deleted",
      operation: "confirm",
    })
    await expect(confirmation).rejects.toBeInstanceOf(
      InvalidMedusaAccountDeactivationResponseError,
    )
  })

  it("returns refreshed token from register flow and forwards login token to refresh", async () => {
    const { sdk, spies } = createSdkMock()
    spies.register.mockResolvedValue("registration_token")
    spies.login.mockResolvedValue("login_token")
    spies.refresh.mockResolvedValue("session_token")
    const service = createMedusaAuthService(sdk)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      }),
    ).resolves.toBe("session_token")

    expect(spies.register).toHaveBeenCalledOnce()
    expect(spies.login).toHaveBeenCalledOnce()
    expect(spies.storeCustomerCreate).toHaveBeenCalledOnce()
    expect(spies.refresh).toHaveBeenCalledWith({
      Authorization: "Bearer login_token",
    })
  })

  it("orders register, login, customer creation, and refresh calls sequentially during registration", async () => {
    const { sdk, spies } = createSdkMock()
    spies.register.mockResolvedValue("registration_token")
    spies.login.mockResolvedValue("login_token")
    spies.refresh.mockResolvedValue("session_token")
    const service = createMedusaAuthService(sdk)

    await service.register({
      email: "john@example.com",
      password: "secret123",
    })

    const registerOrder = firstCallOrder(spies.register)
    const loginOrder = firstCallOrder(spies.login)
    const createOrder = firstCallOrder(spies.storeCustomerCreate)
    const refreshOrder = firstCallOrder(spies.refresh)

    expect(registerOrder).toBeLessThan(loginOrder)
    expect(loginOrder).toBeLessThan(createOrder)
    expect(createOrder).toBeLessThan(refreshOrder)
  })

  it("cleans up and rejects when register requires multi-step auth", async () => {
    const { sdk, spies } = createSdkMock()
    spies.register.mockResolvedValue({
      location: "https://idp.example.test",
    })
    const service = createMedusaAuthService(sdk)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(spies.login).not.toHaveBeenCalled()
    expect(spies.storeCustomerCreate).not.toHaveBeenCalled()
    expect(spies.refresh).not.toHaveBeenCalled()
    expect(spies.logout).toHaveBeenCalledOnce()
  })

  it("cleans up and rejects when register login requires multi-step auth", async () => {
    const { sdk, spies } = createSdkMock()
    spies.login.mockResolvedValue({ location: "https://idp.example.test" })
    const service = createMedusaAuthService(sdk)

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(spies.storeCustomerCreate).not.toHaveBeenCalled()
    expect(spies.refresh).not.toHaveBeenCalled()
    expect(spies.logout).toHaveBeenCalledOnce()
  })

  it("logs logout errors by default and rethrows logout failures", async () => {
    const logoutError = new Error("logout failed")
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { sdk, spies } = createSdkMock()
    spies.logout.mockRejectedValue(logoutError)
    const service = createMedusaAuthService(sdk)

    await expect(service.logout()).rejects.toBe(logoutError)

    expect(warnSpy).toHaveBeenCalledWith(
      "[storefront-data/auth] Failed to logout customer session.",
      logoutError,
    )
  })

  it("calls custom logout reporter and rethrows logout failures", async () => {
    const logoutError = new Error("logout failed")
    const onLogoutError = vi.fn<OnLogoutError>()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { sdk, spies } = createSdkMock()
    spies.logout.mockRejectedValue(logoutError)
    const service = createMedusaAuthService(sdk, { onLogoutError })

    await expect(service.logout()).rejects.toBe(logoutError)

    expect(onLogoutError).toHaveBeenCalledWith(logoutError, "logout")
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("keeps logout as best effort for auth errors (already logged out)", async () => {
    const logoutError = { status: 401 }
    const onLogoutError = vi.fn<OnLogoutError>()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { sdk, spies } = createSdkMock()
    spies.logout.mockRejectedValue(logoutError)
    const service = createMedusaAuthService(sdk, { onLogoutError })

    await expect(service.logout()).resolves.toBeUndefined()

    expect(onLogoutError).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it("reports cleanup logout errors and rethrows original register failure", async () => {
    const registerError = new Error("customer create failed")
    const cleanupLogoutError = new Error("cleanup logout failed")
    const onLogoutError = vi.fn<OnLogoutError>()
    const { sdk, spies } = createSdkMock()
    spies.storeCustomerCreate.mockRejectedValue(registerError)
    spies.logout.mockRejectedValue(cleanupLogoutError)
    const service = createMedusaAuthService(sdk, { onLogoutError })

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      }),
    ).rejects.toBe(registerError)

    expect(onLogoutError).toHaveBeenCalledWith(
      cleanupLogoutError,
      "register-cleanup",
    )
    expect(spies.logout).toHaveBeenCalledOnce()
  })

  it("does not report benign auth errors during register cleanup logout", async () => {
    const logoutError = { status: 401 }
    const onLogoutError = vi.fn<OnLogoutError>()
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    const { sdk, spies } = createSdkMock()
    spies.logout.mockRejectedValue(logoutError)
    spies.login.mockResolvedValue({ location: "https://idp.example.test" })
    const service = createMedusaAuthService(sdk, { onLogoutError })

    await expect(
      service.register({
        email: "john@example.com",
        password: "secret123",
      }),
    ).rejects.toThrow("Multi-step authentication not supported")

    expect(onLogoutError).not.toHaveBeenCalled()
    expect(warnSpy).not.toHaveBeenCalled()
    expect(spies.logout).toHaveBeenCalledOnce()
  })

  it("surfaces refresh failures after customer creation as sign-in errors", async () => {
    const refreshError = new Error("refresh failed")
    const { sdk, spies } = createSdkMock()
    spies.register.mockResolvedValue("registration_token")
    spies.login.mockResolvedValue("login_token")
    spies.refresh.mockRejectedValue(refreshError)
    const service = createMedusaAuthService(sdk)
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
      }),
    )

    await expect(registration).rejects.toBeInstanceOf(
      MedusaRegistrationSignInError,
    )
    expect(spies.storeCustomerCreate).toHaveBeenCalledOnce()
    expect(spies.logout).toHaveBeenCalledOnce()
  })
})
