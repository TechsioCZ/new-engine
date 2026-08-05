import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { login } from "@/services/auth-service"
import type { LoginCredentials } from "@/services/auth-service"

export interface UseLoginOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useLogin(options?: UseLoginOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) =>
      await login(credentials),
    onError: (error: Error) => {
      options?.onError?.(error)
    },
    onSuccess: async () => {
      // Invalidate auth cache to refetch customer data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
      options?.onSuccess?.()
    },
  })
}
