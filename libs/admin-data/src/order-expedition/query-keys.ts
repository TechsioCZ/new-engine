import {
  createQueryKey,
  normalizeQueryKeyPart,
  type QueryNamespace,
} from "../shared/query-keys"
import type {
  OrderBusinessStatusesByIdsParams,
  OrderExpeditionOrdersParams,
  OrderExpeditionQueryKeys,
} from "./types"

function normalizeIds(ids: readonly string[]) {
  return [...ids].sort((a, b) => a.localeCompare(b))
}

export function createOrderExpeditionQueryKeys(
  namespace: QueryNamespace
): OrderExpeditionQueryKeys {
  return {
    all: () => createQueryKey(namespace, "order-expedition"),
    businessStatusesByIds: (params: OrderBusinessStatusesByIdsParams) =>
      createQueryKey(
        namespace,
        "order-expedition",
        "business-statuses-by-ids",
        normalizeQueryKeyPart({ ids: normalizeIds(params.ids) })
      ),
    businessStatusesRoot: () =>
      createQueryKey(namespace, "order-expedition", "business-statuses-by-ids"),
    carriers: () => createQueryKey(namespace, "order-expedition", "carriers"),
    orders: (params: OrderExpeditionOrdersParams) =>
      createQueryKey(
        namespace,
        "order-expedition",
        "orders",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    ordersRoot: () => createQueryKey(namespace, "order-expedition", "orders"),
  }
}
