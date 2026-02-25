import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { AuthQueryKeys } from "./types"

export function createAuthQueryKeys(
  namespace: QueryNamespace
): AuthQueryKeys {
  return {
    all: () => createQueryKey(namespace, "auth"),
    customer: () => createQueryKey(namespace, "auth", "customer"),
    session: () => createQueryKey(namespace, "auth", "session"),
  }
}
