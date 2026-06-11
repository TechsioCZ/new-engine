import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductListQueryKeys } from "./types"

export function createProductListQueryKeys<TListKeyParams, TDetailKeyParams>(
  namespace: QueryNamespace
): ProductListQueryKeys<TListKeyParams, TDetailKeyParams> {
  return {
    all: () => createQueryKey(namespace, "product-lists"),
    list: (params) =>
      createQueryKey(
        namespace,
        "product-lists",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        "product-lists",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
