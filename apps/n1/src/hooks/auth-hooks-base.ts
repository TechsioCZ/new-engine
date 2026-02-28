import type { HttpTypes } from "@medusajs/types"
import { createAuthHooks } from "@techsio/storefront-data/auth/hooks"
import {
  createMedusaAuthService,
  type MedusaAuthCredentials,
  type MedusaRegisterData,
} from "@techsio/storefront-data/auth/medusa-service"
import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { mapAuthError } from "@/lib/auth-messages"
import { cacheConfig as appCacheConfig } from "@/lib/cache-config"
import { logError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import {
  clearToken,
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"

export type LoginCredentials = MedusaAuthCredentials

export type RegisterData = MedusaRegisterData & {
  first_name: string
  last_name: string
}

const authQueryKeys = {
  all: () => queryKeys.auth.all(),
  customer: () => queryKeys.customer.profile(),
  session: () => queryKeys.auth.session(),
}

const storefrontCacheConfig = createCacheConfig({
  userData: appCacheConfig.userData,
})

const baseAuthService = createMedusaAuthService(sdk)

const isExpectedAuthError = (error: unknown): boolean => {
  if (!(error && typeof error === "object")) {
    return false
  }

  const directStatus = "status" in error ? (error as { status?: unknown }).status : null
  if (directStatus === 401 || directStatus === 403) {
    return true
  }

  const responseStatus =
    "response" in error
      ? (error as { response?: { status?: unknown } }).response?.status
      : null

  return responseStatus === 401 || responseStatus === 403
}

export const authHooks = createAuthHooks<
  HttpTypes.StoreCustomer,
  LoginCredentials,
  RegisterData,
  Record<string, never>
>({
  service: {
    async getCustomer(signal?: AbortSignal) {
      const token = getTokenFromStorage()

      if (!token) {
        return null
      }

      if (isTokenExpired(token)) {
        clearToken()
        return null
      }

      try {
        return await baseAuthService.getCustomer(signal)
      } catch (error) {
        if (!isExpectedAuthError(error)) {
          logError("AuthService.getCustomer", error)
        }
        return null
      }
    },

    async login(credentials) {
      try {
        return await baseAuthService.login(credentials)
      } catch (error) {
        logError("AuthService.login", error)
        throw new Error(mapAuthError(error))
      }
    },

    async logout() {
      try {
        await baseAuthService.logout()
      } catch (error) {
        logError("AuthService.logout", error)
      }
    },

    async register(data) {
      try {
        return await baseAuthService.register(data)
      } catch (error) {
        logError("AuthService.register", error)
        throw new Error(mapAuthError(error))
      }
    },
  },
  queryKeys: authQueryKeys,
  queryKeyNamespace: "n1",
  cacheConfig: storefrontCacheConfig,
  invalidateOnAuthChange: {
    includeDefaults: true,
    removeOnLogout: [queryKeys.cart.all()],
  },
})
