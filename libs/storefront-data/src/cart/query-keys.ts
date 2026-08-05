import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { CartQueryKeys } from "./types"

export function createCartQueryKeys(namespace: QueryNamespace): CartQueryKeys {
  return {
    active: (params) =>
      createQueryKey(
        namespace,
        "cart",
        "active",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
      ),
    all: () => createQueryKey(namespace, "cart"),
    detail: (cartId) => createQueryKey(namespace, "cart", "detail", cartId),
  }
}
