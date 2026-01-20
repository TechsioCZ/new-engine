import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { OrderQueryKeys } from "./types"

export function createOrderQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): OrderQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "orders"),
    list: (params) => createQueryKey(namespace, "orders", "list", params),
    detail: (params) => createQueryKey(namespace, "orders", "detail", params),
  }
}
