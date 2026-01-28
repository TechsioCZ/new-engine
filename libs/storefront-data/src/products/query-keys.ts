import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey } from "../shared/query-keys"
import type { ProductQueryKeys } from "./types"

export function createProductQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): ProductQueryKeys<
  TListParams,
  TDetailParams
> {
  return {
    list: (params) => createQueryKey(namespace, "products", "list", params),
    infinite: (params) =>
      createQueryKey(namespace, "products", "infinite", params),
    detail: (params) => createQueryKey(namespace, "products", "detail", params),
  }
}
