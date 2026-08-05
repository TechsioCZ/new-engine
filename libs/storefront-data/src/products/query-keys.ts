import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductQueryKeys } from "./types"

export function createProductQueryKeys<TListParams, TDetailParams>(
  namespace: QueryNamespace
): ProductQueryKeys<TListParams, TDetailParams> {
  return {
    detail: (params) =>
      createQueryKey(
        namespace,
        "products",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    infinite: (params) =>
      createQueryKey(
        namespace,
        "products",
        "infinite",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    list: (params) =>
      createQueryKey(
        namespace,
        "products",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
