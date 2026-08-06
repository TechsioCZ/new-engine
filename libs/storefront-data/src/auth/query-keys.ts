import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey } from "../shared/query-keys"
import type { AuthQueryKeys } from "./types"

export const createAuthQueryKeys = (
  namespace: QueryNamespace,
): AuthQueryKeys => ({
  all: () => createQueryKey(namespace, "auth"),
  customer: () => createQueryKey(namespace, "auth", "customer"),
  session: () => createQueryKey(namespace, "auth", "session"),
})
