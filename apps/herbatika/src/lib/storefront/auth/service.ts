import type { HttpTypes } from "@medusajs/types"
import { createMedusaAuthService } from "@techsio/storefront-data/auth/medusa-service"
import type {
  MedusaConfirmCustomerAccountDeactivationInput,
  MedusaDeactivateCustomerAccountResult,
  MedusaRequestCustomerAccountDeactivationResult,
} from "@techsio/storefront-data/auth/medusa-service"
import type { AuthService } from "@techsio/storefront-data/auth/types"

import {
  authTokenStorage,
  broadcastAuthSessionLogout,
  isSessionProxyAuthMode,
  storefrontSdk,
} from "../sdk"
import {
  requestAuthProxy,
  requestLogoutProxy,
  requestSessionProxy,
} from "./proxy"
import { cleanupDeactivatedSession } from "./session-cleanup"
import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateInput,
} from "./types"

const authServiceBase = createMedusaAuthService(storefrontSdk)
let sessionBootstrapPromise: Promise<string | null> | null = null

const getStoredToken = () => authTokenStorage.get()

const storeToken = async (token: string) => {
  authTokenStorage.set(token)

  try {
    await storefrontSdk.client.setToken(token)
  } catch {
    // noop: storage is already updated above
  }
}

const clearToken = () => {
  authTokenStorage.clear()
}

const fetchCustomer = async (signal?: AbortSignal) =>
  await authServiceBase.getCustomer(signal)

const ensureSessionProxyToken = async (): Promise<string | null> => {
  const existingToken = getStoredToken()
  if ((existingToken ?? "").length > 0) {
    return existingToken
  }

  if (sessionBootstrapPromise) {
    return await sessionBootstrapPromise
  }

  sessionBootstrapPromise = (async () => {
    const response = await requestSessionProxy()
    if (response === null) {
      clearToken()
      return null
    }

    await storeToken(response.token)
    return response.token
  })()

  try {
    return await sessionBootstrapPromise
  } finally {
    sessionBootstrapPromise = null
  }
}

export const authService: AuthService<
  HttpTypes.StoreCustomer,
  AuthLoginInput,
  AuthRegisterInput,
  AuthUpdateInput,
  unknown,
  string,
  string,
  MedusaRequestCustomerAccountDeactivationResult,
  MedusaConfirmCustomerAccountDeactivationInput,
  MedusaDeactivateCustomerAccountResult
> = {
  async confirmAccountDeactivation(
    input: MedusaConfirmCustomerAccountDeactivationInput,
  ) {
    if (!authServiceBase.confirmAccountDeactivation) {
      throw new Error("confirmAccountDeactivation service is not configured")
    }

    const result = await authServiceBase.confirmAccountDeactivation(input)
    await cleanupDeactivatedSession({
      broadcastLogout: broadcastAuthSessionLogout,
      clearToken,
      logout: async () => {
        await authServiceBase.logout()
      },
      ...(isSessionProxyAuthMode ? { logoutProxy: requestLogoutProxy } : {}),
    })
    return result
  },
  async getCustomer(
    signal?: AbortSignal,
  ): Promise<HttpTypes.StoreCustomer | null> {
    if (!isSessionProxyAuthMode) {
      if ((getStoredToken() ?? "").length <= 0) {
        return null
      }

      return await fetchCustomer(signal)
    }

    if ((getStoredToken() ?? "").length <= 0) {
      const restoredToken = await ensureSessionProxyToken()
      if ((restoredToken ?? "").length <= 0) {
        return null
      }
    }

    const customer = await fetchCustomer(signal)
    if (customer) {
      return customer
    }

    if ((getStoredToken() ?? "").length <= 0) {
      return null
    }

    clearToken()

    const restoredToken = await ensureSessionProxyToken()
    if ((restoredToken ?? "").length <= 0) {
      return null
    }

    return await fetchCustomer(signal)
  },
  async login(credentials: AuthLoginInput) {
    const { token } = await requestAuthProxy("login", {
      email: credentials.email,
      password: credentials.password,
    })

    await storeToken(token)
    return token
  },
  async logout() {
    if (isSessionProxyAuthMode) {
      await requestLogoutProxy()
    }

    await authServiceBase.logout()
    clearToken()
    broadcastAuthSessionLogout()
  },
  async register(input: AuthRegisterInput) {
    const { token } = await requestAuthProxy("register", {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      password: input.password,
      wholesale: input.wholesale,
    })

    await storeToken(token)
    return token
  },
  async requestAccountDeactivation() {
    if (!authServiceBase.requestAccountDeactivation) {
      throw new Error("requestAccountDeactivation service is not configured")
    }

    return await authServiceBase.requestAccountDeactivation()
  },
  async updateCustomer(input: AuthUpdateInput) {
    if (!authServiceBase.updateCustomer) {
      throw new Error("updateCustomer service is not configured")
    }

    return await authServiceBase.updateCustomer(input)
  },
}
