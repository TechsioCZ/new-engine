import type { QueryNamespace } from "../shared/query-keys"
import { createQueryKey, normalizeQueryKeyPart } from "../shared/query-keys"
import type { CheckoutQueryKeys } from "./types"

export function createCheckoutQueryKeys(
  namespace: QueryNamespace
): CheckoutQueryKeys {
  return {
    all: () => createQueryKey(namespace, "checkout"),
    paymentProviders: (regionId) =>
      createQueryKey(namespace, "checkout", "payment-providers", regionId),
    shippingOptionPrice: (params) =>
      createQueryKey(
        namespace,
        "checkout",
        "shipping-option",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    shippingOptions: (cartId, cacheKey) =>
      cacheKey
        ? createQueryKey(
            namespace,
            "checkout",
            "shipping-options",
            cartId,
            cacheKey
          )
        : createQueryKey(namespace, "checkout", "shipping-options", cartId),
  }
}
