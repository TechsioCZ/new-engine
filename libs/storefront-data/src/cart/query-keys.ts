import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { CartQueryKeys } from "./types"

export const createCartQueryKeys = (
  namespace: QueryNamespace,
): CartQueryKeys => ({
  active: (params) =>
    createQueryKey(
      namespace,
      "cart",
      "active",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
  all: () => createQueryKey(namespace, "cart"),
  detail: (cartId) => createQueryKey(namespace, "cart", "detail", cartId),
})
