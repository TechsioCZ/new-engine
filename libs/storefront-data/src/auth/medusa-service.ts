import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { AuthService } from "./types"

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined
  }

  const err = error as {
    status?: number
    response?: { status?: number }
  }
  return err.status ?? err.response?.status
}

const isAuthError = (error: unknown) => {
  const status = getErrorStatus(error)
  return status === 401 || status === 403
}

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
 * import { createAuthHooks, createMedusaAuthService } from "@techsio/storefront-data"
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
  sdk: Medusa
): AuthService<
  HttpTypes.StoreCustomer,
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData
> {
  return {
    async getCustomer() {
      try {
        const { customer } = await sdk.store.customer.retrieve()
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
      } catch {
        // Best effort - don't throw on logout errors
      }
    },

    async register(data) {
      // Step 1: Register creates auth identity (email + password)
      const token = await sdk.auth.register("customer", "emailpass", {
        email: data.email,
        password: data.password,
      })

      // Handle OAuth redirects
      if (typeof token !== "string") {
        throw new Error("Multi-step authentication not supported")
      }

      try {
        // Step 2: Login to establish proper session (REQUIRED!)
        await sdk.auth.login("customer", "emailpass", {
          email: data.email,
          password: data.password,
        })

        // Step 3: CREATE customer profile (not update!)
        await sdk.store.customer.create({
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
        })

        // Step 4: Refresh token for proper permissions (REQUIRED!)
        await sdk.auth.refresh()

        return token
      } catch (err) {
        // CRITICAL: Clean up orphaned token if customer.create() failed
        // If register() succeeded but create() failed, we have token without customer
        try {
          await sdk.auth.logout()
        } catch {
          // Ignore logout errors during cleanup
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
