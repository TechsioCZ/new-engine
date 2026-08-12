import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductAttributeQueryKeys } from "./types"

export function createProductAttributeQueryKeys<TParams>(
  namespace: QueryNamespace
): ProductAttributeQueryKeys<TParams> {
  return {
    detail: (params) =>
      createQueryKey(
        namespace,
        "product-attributes",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
