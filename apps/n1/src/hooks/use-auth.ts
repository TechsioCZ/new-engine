import type { HttpTypes } from "@medusajs/types"
import { authHooks } from "./auth-hooks-base"
import {
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"

export type UseAuthReturn = {
  customer: HttpTypes.StoreCustomer | null
  isAuthenticated: boolean
  isLoading: boolean
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

export function useAuth(): UseAuthReturn {
  const { tokenExpired } = getTokenState()
  const auth = authHooks.useAuth()

  return {
    customer: auth.customer,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
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
