import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { type RegisterData, register } from "@/services/auth-service"

export type UseRegisterOptions = {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export function useRegister(options?: UseRegisterOptions) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onSuccess: () => {
      // Invalidate auth cache to refetch customer data
      queryClient.invalidateQueries({ queryKey: queryKeys.customer.profile() })
      options?.onSuccess?.()
    },
    onError: (error: Error) => {
      options?.onError?.(error)
    },
  })
}
