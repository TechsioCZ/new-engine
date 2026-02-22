import { createDomainQueryKeys } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { RegionQueryKeys } from "./types"

export function createRegionQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): RegionQueryKeys<TListParams, TDetailParams> {
  return createDomainQueryKeys(namespace, "regions")
}
