import type { QueryNamespace } from "../shared/query-keys"
import { createDomainQueryKeys } from "../shared/query-keys"
import type { CollectionQueryKeys } from "./types"

export const createCollectionQueryKeys = <TListParams, TDetailParams>(
  namespace: QueryNamespace,
): CollectionQueryKeys<TListParams, TDetailParams> =>
  createDomainQueryKeys(namespace, "collections")
