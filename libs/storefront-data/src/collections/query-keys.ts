import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CollectionQueryKeys } from "./types"

export function createCollectionQueryKeys<
  TListParams,
  TDetailParams,
>(namespace: QueryNamespace): CollectionQueryKeys<TListParams, TDetailParams> {
  return {
    all: () => createQueryKey(namespace, "collections"),
    list: (params) =>
      createQueryKey(
        namespace,
        "collections",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    detail: (params) =>
      createQueryKey(
        namespace,
        "collections",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
