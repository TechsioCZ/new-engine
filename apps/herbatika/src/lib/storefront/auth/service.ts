import type { HttpTypes } from "@medusajs/types"
import { createMedusaAuthService } from "@techsio/storefront-data/auth/medusa-service"
import { storefrontSdk } from "../sdk"
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
let sessionBootstrapPromise: Promise<HttpTypes.StoreCustomer | null> | null =
  null

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
  try {
    await waitWithTimeout(
      requestLogoutProxy(),
      DEACTIVATED_SESSION_CLEANUP_TIMEOUT_MS
    )
  } catch {
    // Account deactivation already succeeded; session cleanup is best-effort.
  }
}

const fetchSessionCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    if (sessionBootstrapPromise) {
      return sessionBootstrapPromise
    }

    sessionBootstrapPromise = (async () => {
      const response = await requestSessionProxy()
      return response?.user ?? null
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
  getCustomer(_signal?: AbortSignal): Promise<HttpTypes.StoreCustomer | null> {
    return fetchSessionCustomer()
  },
  async login(credentials: AuthLoginInput) {
    await requestAuthProxy("login", {
      email: credentials.email,
      password: credentials.password,
    })
    return "authenticated"
  },
  async register(input: AuthRegisterInput) {
    await requestAuthProxy("register", {
      email: input.email,
      password: input.password,
      first_name: input.first_name,
      last_name: input.last_name,
      wholesale: input.wholesale,
    })
    return "authenticated"
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
    await requestLogoutProxy()
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
