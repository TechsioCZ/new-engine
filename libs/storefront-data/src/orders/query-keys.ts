import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { OrderQueryKeys } from "./types"

export const createOrderQueryKeys = <TListParams, TDetailParams>(
  namespace: QueryNamespace,
): OrderQueryKeys<TListParams, TDetailParams> => ({
  all: () => createQueryKey(namespace, "orders"),
  detail: (params) =>
    createQueryKey(
      namespace,
      "orders",
      "detail",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
  list: (params) =>
    createQueryKey(
      namespace,
      "orders",
      "list",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})
