import type { HttpTypes } from "@medusajs/types"
import { storefront } from "./storefront-preset"
import {
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"

export type UseAuthReturn = {
  customer: HttpTypes.StoreCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  isTokenExpired: boolean
}

export type UseSuspenseAuthReturn = {
  customer: HttpTypes.StoreCustomer | null
  isAuthenticated: boolean
  isTokenExpired: boolean
}

const getTokenState = () => {
  const token = getTokenFromStorage()
  const tokenExpired = token ? isTokenExpired(token) : false

  return {
    tokenExpired,
  }
}

const authHooks = storefront.hooks.auth

export function useAuth(): UseAuthReturn {
  const { tokenExpired } = getTokenState()
  const auth = authHooks.useAuth()

  return {
    customer: auth.customer,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    isFetching: auth.isFetching,
    error: auth.error ? new Error(auth.error) : null,
    isTokenExpired: tokenExpired,
  }
}

export function useSuspenseAuth(): UseSuspenseAuthReturn {
  const { tokenExpired } = getTokenState()
  const auth = authHooks.useSuspenseAuth()

  return {
    customer: auth.customer,
    isAuthenticated: auth.isAuthenticated,
    isTokenExpired: tokenExpired,
  }
}
