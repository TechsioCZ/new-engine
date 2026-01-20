import { createQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import type { CheckoutQueryKeys } from "./types"

export function createCheckoutQueryKeys(
  namespace: QueryNamespace
): CheckoutQueryKeys {
  return {
    all: () => createQueryKey(namespace, "checkout"),
    shippingOptions: (cartId) =>
      createQueryKey(namespace, "checkout", "shipping-options", cartId),
    shippingOptionPrice: (params) =>
      createQueryKey(namespace, "checkout", "shipping-option", params),
    paymentProviders: (regionId) =>
      createQueryKey(namespace, "checkout", "payment-providers", regionId),
  }
}
