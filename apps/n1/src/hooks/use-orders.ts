import { useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getOrders } from "@/services/order-service"

import { useSuspenseAuth } from "./use-auth"

export interface UseOrdersOptions {
  limit?: number
  offset?: number
}

export function useSuspenseOrders(options?: UseOrdersOptions) {
  const { isAuthenticated } = useSuspenseAuth()
  const limit = options?.limit || 20
  const offset = options?.offset || 0

  if (!isAuthenticated) {
    throw new Error("Uživatel není přihlášen")
  }

  return useSuspenseQuery({
    queryFn: async () => await getOrders({ limit, offset }),
    queryKey: queryKeys.orders.list({ limit, offset }),
    ...cacheConfig.userData,
  })
}
