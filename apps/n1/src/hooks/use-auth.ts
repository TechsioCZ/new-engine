import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import {
  clearToken,
  getTokenFromStorage,
  isTokenExpired,
} from "@/lib/token-utils"
import { getCustomer } from "@/services/auth-service"

export interface UseAuthReturn {
  customer: Awaited<ReturnType<typeof getCustomer>>
  isAuthenticated: boolean
  isLoading: boolean
  error: Error | null
  isTokenExpired: boolean
}

export interface UseSuspenseAuthReturn {
  customer: Awaited<ReturnType<typeof getCustomer>>
  isAuthenticated: boolean
  isTokenExpired: boolean
}

/**
 * Get current authenticated customer
 * Checks token expiration before making API request
 * Uses userData cache - invalidated explicitly on login/logout/register
 */
export const useAuth = (): UseAuthReturn => {
  const {
    data: customer = null,
    isLoading,
    error,
  } = useQuery({
    queryFn: async () => {
      // Check token expiration BEFORE making request
      const token = getTokenFromStorage()

      if (token === null || token === undefined || token === "") {
        // No token means the user is not authenticated.
        return null
      }

      if (isTokenExpired(token)) {
        // Token expired - clear it and don't make request
        clearToken()
        return null
      }

      // Token valid - fetch customer data
      return await getCustomer()
    },
    queryKey: queryKeys.customer.profile(),
    // Do not retry authentication failures.
    retry: false,
    // Five-minute stale window; authentication actions invalidate the cache.
    ...cacheConfig.userData,
  })

  // Check current token expiration status for UI
  const token = getTokenFromStorage()
  const tokenExpired =
    token !== null && token !== undefined && token !== ""
      ? isTokenExpired(token)
      : false

  return {
    customer,
    error,
    isAuthenticated: customer !== null,
    isLoading,
    isTokenExpired: tokenExpired,
  }
}

export const useSuspenseAuth = (): UseSuspenseAuthReturn => {
  const { data: customer } = useSuspenseQuery({
    queryFn: async () => {
      const token = getTokenFromStorage()

      if (token === null || token === undefined || token === "") {
        return null
      }

      if (isTokenExpired(token)) {
        clearToken()
        return null
      }

      return await getCustomer()
    },
    queryKey: queryKeys.customer.profile(),
    retry: false,
    ...cacheConfig.userData,
  })

  const token = getTokenFromStorage()
  const tokenExpired =
    token !== null && token !== undefined && token !== ""
      ? isTokenExpired(token)
      : false

  return {
    customer,
    isAuthenticated: customer !== null,
    isTokenExpired: tokenExpired,
  }
}
