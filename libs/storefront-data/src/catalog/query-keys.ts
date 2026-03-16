import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CatalogQueryKeys } from "./types"

export function createCatalogQueryKeys<TListParams>(
  namespace: QueryNamespace
): CatalogQueryKeys<TListParams> {
  return {
    all: () => createQueryKey(namespace, "catalog"),
    list: (params) =>
      createQueryKey(
        namespace,
        "catalog",
        "list",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
