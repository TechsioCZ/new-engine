import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { CustomerQueryKeys } from "./types"

export const createCustomerQueryKeys = <TListParams>(
  namespace: QueryNamespace,
): CustomerQueryKeys<TListParams> => ({
  addresses: (params) =>
    createQueryKey(
      namespace,
      "customer",
      "addresses",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
  all: () => createQueryKey(namespace, "customer"),
  profile: () => createQueryKey(namespace, "customer", "profile"),
})
