import { createDomainQueryKeys } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CollectionQueryKeys } from "./types"

export function createCollectionQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): CollectionQueryKeys<TListParams, TDetailParams> {
  return createDomainQueryKeys(namespace, "collections")
}
