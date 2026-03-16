import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { OrderQueryKeys } from "./types"

export function createOrderQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): OrderQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "orders"),
    list: (params) =>
      createQueryKey(
        namespace,
        "orders",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        "orders",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
