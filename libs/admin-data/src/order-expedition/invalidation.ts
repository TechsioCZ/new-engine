import type { QueryClient } from "@tanstack/react-query"
import type { OrderExpeditionQueryKeys } from "./types"

export type OrderExpeditionInvalidationTarget =
  | "all"
  | "business-statuses"
  | "carriers"
  | "orders"

export async function invalidateOrderExpeditionQueries(
  queryClient: QueryClient,
  queryKeys: OrderExpeditionQueryKeys,
  target: OrderExpeditionInvalidationTarget = "all"
) {
  if (target === "all") {
    await queryClient.invalidateQueries({ queryKey: queryKeys.all() })
    return
  }

  if (target === "orders") {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot() })
    return
  }

  if (target === "business-statuses") {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.businessStatusesRoot(),
    })
    return
  }

  await queryClient.invalidateQueries({ queryKey: queryKeys.carriers() })
}

export async function invalidateOrderExpeditionOrderState(
  queryClient: QueryClient,
  queryKeys: OrderExpeditionQueryKeys
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.ordersRoot() }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.businessStatusesRoot(),
    }),
  ])
}
