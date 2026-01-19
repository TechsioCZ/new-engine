import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey } from "../shared/query-keys"
import type { ProductQueryKeys } from "./types"

export function createProductQueryKeys<
  TListParams,
  TDetailParams = Record<string, unknown>,
>(namespace: QueryNamespace = "storefront-data"): ProductQueryKeys<
  TListParams,
  TDetailParams
> {
  return {
    list: (params) => createQueryKey(namespace, "products", "list", params),
    detail: (params) => createQueryKey(namespace, "products", "detail", params),
  }
}
