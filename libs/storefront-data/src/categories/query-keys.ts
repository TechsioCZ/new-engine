import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CategoryQueryKeys } from "./types"

export function createCategoryQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): CategoryQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "categories"),
    list: (params) =>
      createQueryKey(
        namespace,
        "categories",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        "categories",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
