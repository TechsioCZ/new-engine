import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { logout } from "@/services/auth-service"

export type UseLogoutOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Logout mutation hook
 * Clears all user data cache on success:
 * - Auth (customer, session)
 * - Orders (order history)
 * - Cart (active cart)
 * - Customer (addresses)
 */
export function useLogout(options?: UseLogoutOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Invalidate all user data first (triggers refetch on mounted queries)
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.all() })

      // Then remove from cache (clears stale data)
      queryClient.removeQueries({ queryKey: queryKeys.auth.all() })
      queryClient.removeQueries({ queryKey: queryKeys.orders.all() })
      queryClient.removeQueries({ queryKey: queryKeys.cart.all() })
      queryClient.removeQueries({ queryKey: queryKeys.customer.all() })

      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error)
    },
  })
}
