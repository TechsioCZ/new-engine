import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CollectionQueryKeys } from "./types"

export function createCollectionQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): CollectionQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "collections"),
    list: (params) => createQueryKey(namespace, "collections", "list", params),
    detail: (params) =>
      createQueryKey(namespace, "collections", "detail", params),
  }
}
