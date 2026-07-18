import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import {
  clearToken,
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"
import { getCustomer } from "@/services/auth-service"

export type UseAuthReturn = {
  customer: Awaited<ReturnType<typeof getCustomer>>
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  isTokenExpired: boolean
}

export type UseSuspenseAuthReturn = {
  customer: Awaited<ReturnType<typeof getCustomer>>
  isAuthenticated: boolean
  isTokenExpired: boolean
}

/**
 * Get current authenticated customer
 * Checks token expiration before making API request
 * Uses userData cache - invalidated explicitly on login/logout/register
 */
export function useAuth(): UseAuthReturn {
  const {
    data: customer = null,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.customer.profile(),
    queryFn: () => {
      // Check token expiration BEFORE making request
      const token = getTokenFromStorage()

      if (!token) {
        return null // No token = not authenticated
      }

      if (isTokenExpired(token)) {
        // Token expired - clear it and don't make request
        clearToken()
        return null
      }

      // Token valid - fetch customer data
      return getCustomer()
    },
    retry: false, // Don't retry auth failures
    ...cacheConfig.userData, // 5min stale, invalidated on auth actions
  })

  // Check current token expiration status for UI
  const token = getTokenFromStorage()
  const tokenExpired = token ? isTokenExpired(token) : false

  return {
    customer,
    isAuthenticated: customer !== null,
    isLoading,
    error: error as Error | null,
    isTokenExpired: tokenExpired,
  }
}

export function useSuspenseAuth(): UseSuspenseAuthReturn {
  const { data: customer = null } = useSuspenseQuery({
    queryKey: queryKeys.customer.profile(),
    queryFn: () => {
      const token = getTokenFromStorage()

      if (!token) {
        return null
      }

      if (isTokenExpired(token)) {
        clearToken()
        return null
      }

      return getCustomer()
    },
    retry: false,
    ...cacheConfig.userData,
  })

  const token = getTokenFromStorage()
  const tokenExpired = token ? isTokenExpired(token) : false

  return {
    customer,
    isAuthenticated: customer !== null,
    isTokenExpired: tokenExpired,
  }
}
