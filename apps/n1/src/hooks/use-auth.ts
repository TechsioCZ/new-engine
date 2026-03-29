import type { HttpTypes } from "@medusajs/types"
import { toError } from "@/lib/errors"
import { storefront } from "./storefront-preset"

export type UseAuthReturn = {
  customer: HttpTypes.StoreCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
}

export type UseSuspenseAuthReturn = {
  customer: HttpTypes.StoreCustomer | null
  isAuthenticated: boolean
}

const authHooks = storefront.hooks.auth

export function useAuth(): UseAuthReturn {
  const auth = authHooks.useAuth()

  return {
    customer: auth.customer,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isFetching: auth.isFetching,
    error: auth.error
      ? toError(auth.error, "Nepodařilo se ověřit přihlášení")
      : null,
  }
}

export function useSuspenseAuth(): UseSuspenseAuthReturn {
  const auth = authHooks.useSuspenseAuth()

  return {
    customer: auth.customer,
    isAuthenticated: auth.isAuthenticated,
  }
}
