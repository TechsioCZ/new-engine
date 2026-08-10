import type { QueryNamespace } from "../shared/query-keys"
import { createDomainQueryKeys } from "../shared/query-keys"
import type { CategoryQueryKeys } from "./types"

export const createCategoryQueryKeys = <TListParams, TDetailParams>(
  namespace: QueryNamespace,
): CategoryQueryKeys<TListParams, TDetailParams> =>
  createDomainQueryKeys(namespace, "categories")
