import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import {
  type UpdateCustomerData,
  updateCustomer,
} from "@/services/customer-service"

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateCustomerData) => updateCustomer(data),
    onSuccess: async () => {
      // Invalidate customer cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}
