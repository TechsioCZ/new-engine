import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductAttributeQueryKeys } from "./types"

export const createProductAttributeQueryKeys = <TParams>(
  namespace: QueryNamespace,
): ProductAttributeQueryKeys<TParams> => ({
  detail: (params) =>
    createQueryKey(
      namespace,
      "product-attributes",
      "detail",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})
