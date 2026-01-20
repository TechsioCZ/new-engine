import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CartQueryKeys } from "./types"

export function createCartQueryKeys(
  namespace: QueryNamespace
): CartQueryKeys {
  return {
    all: () => createQueryKey(namespace, "cart"),
    active: (params) => createQueryKey(namespace, "cart", "active", params),
    detail: (cartId) => createQueryKey(namespace, "cart", "detail", cartId),
  }
}
