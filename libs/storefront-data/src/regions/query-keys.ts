import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { RegionQueryKeys } from "./types"

export function createRegionQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): RegionQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "regions"),
    list: (params) =>
      createQueryKey(
        namespace,
        "regions",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        "regions",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
