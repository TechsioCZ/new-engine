import { useQuery } from "@tanstack/react-query"

import { sdk } from "@/lib/medusa-client"
import { ORDER_FIELDS } from "@/lib/order-utils"
import { queryKeys } from "@/lib/query-keys"

export const useOrders = (userId?: string) =>
  useQuery({
    enabled: userId !== undefined && userId.length > 0,
    queryFn: async () => {
      const response = await sdk.store.order.list({
        fields: ORDER_FIELDS.join(","),
      })
      return response
    },
    queryKey: queryKeys.orders.list(),
    staleTime: 5 * 60 * 1000,
  })
