import type { HttpTypes } from "@medusajs/types"
import { createMedusaAuthService } from "@techsio/storefront-data/auth/medusa-service"
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

const fetchCustomer = (signal?: AbortSignal) =>
  authServiceBase.getCustomer(signal)

const DEACTIVATED_SESSION_CLEANUP_TIMEOUT_MS = 3000

const waitWithTimeout = async (
  promise: Promise<unknown>,
  timeoutMs: number
) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  try {
    await Promise.race([
      promise,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, timeoutMs)
      }),
    ])
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }
}

const cleanupDeactivatedSession = async () => {
  const cleanupOperations = [authServiceBase.logout()]

  if (isSessionProxyAuthMode) {
    cleanupOperations.push(requestLogoutProxy())
  }

  try {
    await waitWithTimeout(
      Promise.allSettled(cleanupOperations),
      DEACTIVATED_SESSION_CLEANUP_TIMEOUT_MS
    )
  } finally {
    clearToken()
    broadcastAuthSessionLogout()
  }
}

const ensureSessionProxyToken = async (): Promise<string | null> => {
  const existingToken = getStoredToken()
  if (existingToken) {
    return existingToken
  }

  if (sessionBootstrapPromise) {
    return sessionBootstrapPromise
  }

  sessionBootstrapPromise = (async () => {
    const response = await requestSessionProxy()
    if (!response?.token) {
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

export const authService = {
  async confirmAccountDeactivation(input: { token: string }) {
    if (!authServiceBase.confirmAccountDeactivation) {
      throw new Error("confirmAccountDeactivation service is not configured")
    }

    const result = await authServiceBase.confirmAccountDeactivation(input)
    await cleanupDeactivatedSession()
    return result
  },
  async getCustomer(
    signal?: AbortSignal
  ): Promise<HttpTypes.StoreCustomer | null> {
    if (!isSessionProxyAuthMode) {
      if (!getStoredToken()) {
        return null
      }

      return fetchCustomer(signal)
    }

    if (!getStoredToken()) {
      const restoredToken = await ensureSessionProxyToken()
      if (!restoredToken) {
        return null
      }
    }

    const customer = await fetchCustomer(signal)
    if (customer) {
      return customer
    }

    if (!getStoredToken()) {
      return null
    }

    clearToken()

    const restoredToken = await ensureSessionProxyToken()
    if (!restoredToken) {
      return null
    }

    return fetchCustomer(signal)
  },
  async login(credentials: AuthLoginInput) {
    const { token } = await requestAuthProxy("login", {
      email: credentials.email,
      password: credentials.password,
    })

    await storeToken(token)
    return token
  },
  async register(input: AuthRegisterInput) {
    const { token } = await requestAuthProxy("register", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
      wholesale: input.wholesale,
    })

    await storeToken(token)
    return token
  },
  requestAccountDeactivation() {
    if (!authServiceBase.requestAccountDeactivation) {
      return Promise.reject(
        new Error("requestAccountDeactivation service is not configured")
      )
    }

    return authServiceBase.requestAccountDeactivation()
  },
  async logout() {
    if (isSessionProxyAuthMode) {
      await requestLogoutProxy()
    }

    await authServiceBase.logout()
    clearToken()
    broadcastAuthSessionLogout()
  },
  updateCustomer(input: AuthUpdateInput) {
    if (!authServiceBase.updateCustomer) {
      return Promise.reject(
        new Error("updateCustomer service is not configured")
      )
    }

    return authServiceBase.updateCustomer(input)
  },
}
