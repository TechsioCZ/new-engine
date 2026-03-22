import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { toComparableTimestamp } from "../shared/date-utils"
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

export class MedusaRegistrationSignInError extends Error {
  readonly code = "registration_sign_in_failed"
  readonly email: string
  readonly reason: unknown

  constructor(email: string, reason: unknown) {
    super(
      "Customer account was created, but automatic sign-in failed. Please sign in again."
    )
    this.name = "MedusaRegistrationSignInError"
    this.email = email
    this.reason = reason
  }
}

export type MedusaLogoutErrorContext =
  | "logout"
  | "register-cleanup"
  | "register-signin-recovery"

export type MedusaAuthServiceConfig = {
  onLogoutError?: (error: unknown, context: MedusaLogoutErrorContext) => void
}

const defaultReportLogoutError = (
  error: unknown,
  context: MedusaLogoutErrorContext
) => {
  let message = "[storefront-data/auth] Failed to cleanup auth session after register error."

  if (context === "logout") {
    message = "[storefront-data/auth] Failed to logout customer session."
  } else if (context === "register-signin-recovery") {
    message =
      "[storefront-data/auth] Failed to cleanup auth session after registration sign-in recovery error."
  }

  console.warn(message, error)
}

/**
 * Creates an AuthService for Medusa SDK
 *
 * Includes multi-step registration flow:
 * 1. Register auth identity
 * 2. Login to establish customer auth state
 * 3. Create customer profile
 * 4. Refresh auth state so subsequent requests use a token/session that
 *    includes the created customer actor.
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

  const cleanupRegisterSession = async (context: MedusaLogoutErrorContext) => {
    try {
      await sdk.auth.logout()
    } catch (logoutError) {
      if (isAuthError(logoutError)) {
        return
      }
      reportLogoutError(logoutError, context)
    }
  }

  const refreshRegisterSession = async (loginToken: string) => {
    const sessionToken = await sdk.auth.refresh({
      Authorization: `Bearer ${loginToken}`,
    })

    if (typeof sessionToken !== "string") {
      throw new Error("Multi-step authentication not supported")
    }

    return sessionToken
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
              toComparableTimestamp(a.created_at) -
              toComparableTimestamp(b.created_at)
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
        if (isAuthError(error)) {
          return
        }
        reportLogoutError(error, "logout")
        throw error
      }
    },

    async register(data) {
      // Step 1: Register creates auth identity (email + password)
      const registrationToken = await sdk.auth.register("customer", "emailpass", {
        email: data.email,
        password: data.password,
      })
      let customerCreated = false

      try {
        // Handle OAuth redirects.
        // This guard lives inside the cleanup scope so we always attempt logout
        // when register created an auth identity but we cannot continue.
        if (typeof registrationToken !== "string") {
          throw new Error("Multi-step authentication not supported")
        }

        // Step 2: Login to establish the standard customer auth state before
        // creating the customer profile. This works for both JWT and session
        // auth modes through the SDK.
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
        customerCreated = true

        // Step 4: Refresh auth state after customer creation so the JWT/session
        // reflects the newly created customer actor. In session mode the SDK
        // does not keep a bearer token around, so we forward the login token
        // explicitly to the refresh endpoint.
        return await refreshRegisterSession(loginToken)
      } catch (err) {
        const logoutContext: MedusaLogoutErrorContext = customerCreated
          ? "register-signin-recovery"
          : "register-cleanup"

        await cleanupRegisterSession(logoutContext)

        if (customerCreated) {
          throw new MedusaRegistrationSignInError(data.email, err)
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
