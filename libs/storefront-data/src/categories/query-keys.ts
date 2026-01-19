import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CategoryQueryKeys } from "./types"

export function createCategoryQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): CategoryQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "categories"),
    list: (params) => createQueryKey(namespace, "categories", "list", params),
    detail: (params) =>
      createQueryKey(namespace, "categories", "detail", params),
  }
}
