import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { isAuthError } from "../shared/medusa-errors"
import type { AuthService } from "./types"

export type MedusaAuthCredentials = {
  email: string
  password: string
}

export type MedusaRegisterData = {
  email: string
  password: string
  first_name?: string
  last_name?: string
}

export type MedusaUpdateCustomerData = Partial<{
  first_name: string
  last_name: string
  phone: string
}>

export type MedusaLogoutErrorContext = "logout" | "register-cleanup"

export type MedusaAuthServiceConfig = {
  onLogoutError?: (error: unknown, context: MedusaLogoutErrorContext) => void
}

const defaultReportLogoutError = (
  error: unknown,
  context: MedusaLogoutErrorContext
) => {
  const message =
    context === "logout"
      ? "[storefront-data/auth] Failed to logout customer session."
      : "[storefront-data/auth] Failed to cleanup auth session after register error."
  console.warn(message, error)
}

/**
 * Creates an AuthService for Medusa SDK
 *
 * Includes multi-step registration flow:
 * 1. Register auth identity
 * 2. Login to establish session
 * 3. Create customer profile
 * 4. Refresh token for proper permissions
 *
 * @example
 * ```typescript
 * import { createAuthHooks } from "@techsio/storefront-data/auth/hooks"
 * import { createMedusaAuthService } from "@techsio/storefront-data/auth/medusa-service"
 * import { sdk } from "@/lib/medusa-client"
 *
 * export const authHooks = createAuthHooks({
 *   service: createMedusaAuthService(sdk),
 *   queryKeys: authQueryKeys,
 *   cacheConfig,
 * })
 * ```
 */
export function createMedusaAuthService(
  sdk: Medusa,
  config?: MedusaAuthServiceConfig
): AuthService<
  HttpTypes.StoreCustomer,
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
  unknown,
  string,
  string
> {
  const reportLogoutError = (
    error: unknown,
    context: MedusaLogoutErrorContext
  ) => {
    if (config?.onLogoutError) {
      try {
        config.onLogoutError(error, context)
        return
      } catch {
        // Keep logout best-effort: reporting must never break auth flow.
      }
    }

    try {
      defaultReportLogoutError(error, context)
    } catch {
      // Keep logout best-effort: reporting must never break auth flow.
    }
  }

  return {
    async getCustomer(signal?: AbortSignal) {
      try {
        const { customer } = await sdk.client.fetch<HttpTypes.StoreCustomerResponse>(
          "/store/customers/me",
          { signal }
        )
        if (!customer) {
          return null
        }

        // Sort addresses by creation date (oldest first)
        if (customer.addresses?.length) {
          customer.addresses = [...customer.addresses].sort(
            (a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        }
        return customer
      } catch (error) {
        if (isAuthError(error)) {
          // Not authenticated or session expired
          return null
        }
        throw error
      }
    },

    async login(credentials) {
      const token = await sdk.auth.login("customer", "emailpass", credentials)

      // Handle OAuth redirects
      if (typeof token !== "string") {
        throw new Error("Multi-step authentication not supported")
      }

      return token
    },

    async logout() {
      try {
        await sdk.auth.logout()
      } catch (error) {
        reportLogoutError(error, "logout")
      }
    },

    async register(data) {
      // Step 1: Register creates auth identity (email + password)
      const registrationToken = await sdk.auth.register("customer", "emailpass", {
        email: data.email,
        password: data.password,
      })

      // Handle OAuth redirects
      if (typeof registrationToken !== "string") {
        throw new Error("Multi-step authentication not supported")
      }

      try {
        // Step 2: Login to establish proper session (REQUIRED!)
        const loginToken = await sdk.auth.login("customer", "emailpass", {
          email: data.email,
          password: data.password,
        })
        if (typeof loginToken !== "string") {
          throw new Error("Multi-step authentication not supported")
        }

        // Step 3: CREATE customer profile (not update!)
        await sdk.store.customer.create({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
        })

        // Step 4: Refresh token for proper permissions (REQUIRED!)
        const sessionToken = await sdk.auth.refresh()
        if (typeof sessionToken !== "string") {
          throw new Error("Multi-step authentication not supported")
        }

        return sessionToken
      } catch (err) {
        // CRITICAL: Clean up orphaned token if customer.create() failed
        // If register() succeeded but create() failed, we have token without customer
        try {
          await sdk.auth.logout()
        } catch (logoutError) {
          reportLogoutError(logoutError, "register-cleanup")
        }
        throw err
      }
    },

    async updateCustomer(data) {
      const { customer } = await sdk.store.customer.update(data)
      return customer
    },
  }
}
