import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { CatalogQueryKeys } from "./types"

export const createCatalogQueryKeys = <TListParams>(
  namespace: QueryNamespace,
): CatalogQueryKeys<TListParams> => ({
  all: () => createQueryKey(namespace, "catalog"),
  list: (params) =>
    createQueryKey(
      namespace,
      "catalog",
      "list",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})
