import type { QueryNamespace } from "../shared/query-keys"
import { createDomainQueryKeys } from "../shared/query-keys"
import type { RegionQueryKeys } from "./types"

export const createRegionQueryKeys = <TListParams, TDetailParams>(
  namespace: QueryNamespace,
): RegionQueryKeys<TListParams, TDetailParams> =>
  createDomainQueryKeys(namespace, "regions")
