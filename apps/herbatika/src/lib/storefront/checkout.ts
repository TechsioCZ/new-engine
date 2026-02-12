import {
  createCheckoutHooks,
  createMedusaCheckoutService,
} from "@techsio/storefront-data";
import { cartQueryKeys } from "./cart";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

export const checkoutService = createMedusaCheckoutService(storefrontSdk);

export const checkoutHooks = createCheckoutHooks({
  service: checkoutService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cartQueryKeys,
});

export const {
  useCheckoutShipping,
  useSuspenseCheckoutShipping,
  useCheckoutPayment,
  useSuspenseCheckoutPayment,
  getPaymentProvidersQueryOptions,
  fetchPaymentProviders,
} = checkoutHooks;
