import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CustomerQueryKeys } from "./types"

export function createCustomerQueryKeys<TListParams>(
  namespace: QueryNamespace
): CustomerQueryKeys<TListParams> {
  return {
    all: () => createQueryKey(namespace, "customer"),
    profile: () => createQueryKey(namespace, "customer", "profile"),
    addresses: (params) =>
      createQueryKey(namespace, "customer", "addresses", params),
  }
}
