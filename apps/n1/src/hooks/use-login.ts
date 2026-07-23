import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { type LoginCredentials, login } from "@/services/auth-service"

export type UseLoginOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useLogin(options?: UseLoginOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials),
    onSuccess: async () => {
      // Invalidate auth cache to refetch customer data
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error)
    },
  })
}
