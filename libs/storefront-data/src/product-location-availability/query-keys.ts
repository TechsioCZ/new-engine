import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductLocationAvailabilityQueryKeys } from "./types"

export const createProductLocationAvailabilityQueryKeys = <TParams>(
  namespace: QueryNamespace,
): ProductLocationAvailabilityQueryKeys<TParams> => ({
  detail: (params) =>
    createQueryKey(
      namespace,
      "product-location-availability",
      "detail",
      normalizeQueryKeyPart(params, { omitKeys: ["enabled"] }),
    ),
})
