import type { StoreCustomer } from "@medusajs/types"

import { mapAuthError } from "@/lib/auth-messages"
import { logError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { clearToken } from "@/lib/token-utils"

export type LoginCredentials = {
  email: string
  password: string
}

export type RegisterData = {
  email: string
  password: string
  first_name: string
  last_name: string
}

export async function login(
  credentials: LoginCredentials
): Promise<string | undefined> {
  try {
    const token = await sdk.auth.login("customer", "emailpass", {
      email: credentials.email,
      password: credentials.password,
    })

    // Handle multi-step auth (OAuth providers)
    if (typeof token !== "string") {
      throw new Error("Multi-step authentication not supported")
    }

    return token
  } catch (err) {
    logError("AuthService.login", err)
    throw new Error(mapAuthError(err))
  }
}

export async function register(
  data: RegisterData
): Promise<string | undefined> {
  try {
    // Step 1: Register creates auth identity (email + password)
    const token = await sdk.auth.register("customer", "emailpass", {
      email: data.email,
      password: data.password,
    })

    // Handle multi-step auth
    if (typeof token !== "string") {
      throw new Error("Multi-step authentication not supported")
    }

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
    logError("AuthService.register", err)

    // CRITICAL: Clean up orphaned token if customer.create() failed
    // If register() succeeded but create() failed, we have token without customer
    clearToken()

    throw new Error(mapAuthError(err))
  }
}

export async function logout(): Promise<void> {
  try {
    await sdk.auth.logout()
  } catch (err) {
    logError("AuthService.logout", err)
    // Don't throw on logout errors - best effort
  }
}

export async function getCustomer(): Promise<StoreCustomer | null> {
  try {
    const response = await sdk.store.customer.retrieve()
    const customer = response.customer

    if (!customer) {
      return null
    }

    if (customer.addresses?.length) {
      customer.addresses = [...customer.addresses].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }
    return customer
  } catch {
    // Not authenticated or session expired
    return null
  }
}
