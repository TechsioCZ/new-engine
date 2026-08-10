import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductListQueryKeys } from "./types"

const PRODUCT_LISTS_DOMAIN = "product-lists"

export const createProductListQueryKeys = <TListKeyParams, TDetailKeyParams>(
  namespace: QueryNamespace,
): ProductListQueryKeys<TListKeyParams, TDetailKeyParams> => ({
  all: () => createQueryKey(namespace, PRODUCT_LISTS_DOMAIN),
  detail: (params) =>
    createQueryKey(
      namespace,
      PRODUCT_LISTS_DOMAIN,
      "detail",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
  list: (params) =>
    createQueryKey(
      namespace,
      PRODUCT_LISTS_DOMAIN,
      "list",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})
