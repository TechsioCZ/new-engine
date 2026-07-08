import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductLocationAvailabilityQueryKeys } from "./types"

export function createProductLocationAvailabilityQueryKeys<TParams>(
  namespace: QueryNamespace
): ProductLocationAvailabilityQueryKeys<TParams> {
  return {
    detail: (params) =>
      createQueryKey(
        namespace,
        "product-location-availability",
        "detail",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
