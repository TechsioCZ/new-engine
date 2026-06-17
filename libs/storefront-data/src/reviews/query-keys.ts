import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { ProductReviewQueryKeys } from "./types"

export function createProductReviewQueryKeys<TListParams>(
  namespace: QueryNamespace
): ProductReviewQueryKeys<TListParams> {
  return {
    all: () => createQueryKey(namespace, "reviews"),
    productList: (params) =>
      createQueryKey(
        namespace,
        "reviews",
        "product",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}
