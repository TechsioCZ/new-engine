import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { isRecord, omitUndefined } from "@techsio/std/object"

import { toComparableTimestamp } from "../shared/date-utils"
import { isAuthError } from "../shared/medusa-errors"
import { InvalidMedusaAccountDeactivationResponseError } from "./account-deactivation-errors"
import type { MedusaAccountDeactivationOperation } from "./account-deactivation-errors"
import type { AuthService } from "./types"

export { InvalidMedusaAccountDeactivationResponseError } from "./account-deactivation-errors"

const MULTI_STEP_AUTH_UNSUPPORTED = "Multi-step authentication not supported"

export interface MedusaAuthCredentials {
  email: string
  password: string
}

export interface MedusaRegisterData {
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

export interface MedusaRequestCustomerAccountDeactivationResult {
  customer_id: string
  sent: boolean
}

export interface MedusaConfirmCustomerAccountDeactivationInput {
  token: string
}

export interface MedusaDeactivateCustomerAccountResult {
  auth_identity_deleted: boolean
  customer_id: string
  deleted: boolean
}

const readCustomerId = (
  value: Record<string, unknown>,
  operation: MedusaAccountDeactivationOperation,
): string => {
  const customerId = value["customer_id"]
  if (typeof customerId !== "string" || customerId.trim().length === 0) {
    throw new InvalidMedusaAccountDeactivationResponseError(
      operation,
      "customer_id",
    )
  }
  return customerId
}

const parseDeactivationRequestResponse = (
  value: unknown,
): MedusaRequestCustomerAccountDeactivationResult => {
  if (!isRecord(value)) {
    throw new InvalidMedusaAccountDeactivationResponseError(
      "request",
      "response body",
    )
  }
  const customerId = readCustomerId(value, "request")
  const { sent } = value
  if (typeof sent !== "boolean") {
    throw new InvalidMedusaAccountDeactivationResponseError("request", "sent")
  }
  return { customer_id: customerId, sent }
}

const parseDeactivationConfirmationResponse = (
  value: unknown,
): MedusaDeactivateCustomerAccountResult => {
  if (!isRecord(value)) {
    throw new InvalidMedusaAccountDeactivationResponseError(
      "confirm",
      "response body",
    )
  }
  const customerId = readCustomerId(value, "confirm")
  const authIdentityDeleted = value["auth_identity_deleted"]
  const { deleted } = value
  if (typeof authIdentityDeleted !== "boolean") {
    throw new InvalidMedusaAccountDeactivationResponseError(
      "confirm",
      "auth_identity_deleted",
    )
  }
  if (typeof deleted !== "boolean") {
    throw new InvalidMedusaAccountDeactivationResponseError(
      "confirm",
      "deleted",
    )
  }
  return {
    auth_identity_deleted: authIdentityDeleted,
    customer_id: customerId,
    deleted,
  }
}

export class MedusaRegistrationSignInError extends Error {
  readonly code = "registration_sign_in_failed"
  readonly email: string
  readonly reason: unknown

  constructor(email: string, reason: unknown) {
    super(
      "Customer account was created, but automatic sign-in failed. Please sign in again.",
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

export interface MedusaAuthServiceConfig {
  onLogoutError?: (error: unknown, context: MedusaLogoutErrorContext) => void
}

const defaultReportLogoutError = (
  error: unknown,
  context: MedusaLogoutErrorContext,
) => {
  let message =
    "[storefront-data/auth] Failed to cleanup auth session after register error."

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
export const createMedusaAuthService = (
  sdk: Medusa,
  config?: MedusaAuthServiceConfig,
): AuthService<
  HttpTypes.StoreCustomer,
  MedusaAuthCredentials,
  MedusaRegisterData,
  MedusaUpdateCustomerData,
  unknown,
  string,
  string,
  MedusaRequestCustomerAccountDeactivationResult,
  MedusaConfirmCustomerAccountDeactivationInput,
  MedusaDeactivateCustomerAccountResult
> => {
  const reportLogoutError = (
    error: unknown,
    context: MedusaLogoutErrorContext,
  ) => {
    if (config?.onLogoutError !== undefined) {
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
      throw new TypeError(MULTI_STEP_AUTH_UNSUPPORTED)
    }

    return sessionToken
  }

  return {
    async confirmAccountDeactivation(input) {
      const response: unknown = await sdk.client.fetch<unknown>(
        "/store/customers/deactivate/confirm",
        {
          body: { token: input.token },
          method: "POST",
        },
      )
      return parseDeactivationConfirmationResponse(response)
    },

    async getCustomer(signal?: AbortSignal) {
      try {
        const { customer } =
          await sdk.client.fetch<HttpTypes.StoreCustomerResponse>(
            "/store/customers/me",
            { signal: signal ?? null },
          )
        // Sort addresses by creation date (oldest first) without mutating the SDK array.
        if (customer.addresses !== undefined && customer.addresses.length > 0) {
          const sortedAddresses: HttpTypes.StoreCustomerAddress[] = []
          for (const address of customer.addresses) {
            const insertionIndex = sortedAddresses.findIndex(
              (candidate) =>
                toComparableTimestamp(candidate.created_at) >
                toComparableTimestamp(address.created_at),
            )
            if (insertionIndex === -1) {
              sortedAddresses.push(address)
            } else {
              sortedAddresses.splice(insertionIndex, 0, address)
            }
          }
          customer.addresses = sortedAddresses
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
        throw new TypeError(MULTI_STEP_AUTH_UNSUPPORTED)
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
      const registrationToken = await sdk.auth.register(
        "customer",
        "emailpass",
        {
          email: data.email,
          password: data.password,
        },
      )
      let customerCreated = false

      try {
        // Handle OAuth redirects.
        // This guard lives inside the cleanup scope so we always attempt logout
        // when register created an auth identity but we cannot continue.
        if (typeof registrationToken !== "string") {
          throw new TypeError(MULTI_STEP_AUTH_UNSUPPORTED)
        }

        // Step 2: Login to establish the standard customer auth state before
        // creating the customer profile. This works for both JWT and session
        // auth modes through the SDK.
        const loginToken = await sdk.auth.login("customer", "emailpass", {
          email: data.email,
          password: data.password,
        })
        if (typeof loginToken !== "string") {
          throw new TypeError(MULTI_STEP_AUTH_UNSUPPORTED)
        }

        // Step 3: CREATE customer profile (not update!)
        await sdk.store.customer.create(
          omitUndefined({
            email: data.email,
            first_name: data.first_name,
            last_name: data.last_name,
          }),
        )
        customerCreated = true

        // Step 4: Refresh auth state after customer creation so the JWT/session
        // reflects the newly created customer actor. In session mode the SDK
        // does not keep a bearer token around, so we forward the login token
        // explicitly to the refresh endpoint.
        return await refreshRegisterSession(loginToken)
      } catch (error) {
        const logoutContext: MedusaLogoutErrorContext = customerCreated
          ? "register-signin-recovery"
          : "register-cleanup"

        await cleanupRegisterSession(logoutContext)

        if (customerCreated) {
          throw new MedusaRegistrationSignInError(data.email, error)
        }

        throw error
      }
    },

    async requestAccountDeactivation() {
      const response: unknown = await sdk.client.fetch<unknown>(
        "/store/customers/me/deactivate",
        {
          body: { confirm: true },
          method: "POST",
        },
      )
      return parseDeactivationRequestResponse(response)
    },

    async updateCustomer(data) {
      const { customer } = await sdk.store.customer.update(data)
      return customer
    },
  }
}
