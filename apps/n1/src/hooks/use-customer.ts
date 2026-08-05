import { useMutation, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/lib/query-keys"
import { updateCustomer } from "@/services/customer-service"
import type { UpdateCustomerData } from "@/services/customer-service"

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateCustomerData) => updateCustomer(data),
    onSuccess: async () => {
      // Invalidate customer cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}
