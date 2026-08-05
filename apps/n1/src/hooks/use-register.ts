import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { register } from "@/services/auth-service"
import type { RegisterData } from "@/services/auth-service"

export interface UseRegisterOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useRegister(options?: UseRegisterOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RegisterData) => register(data),
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
