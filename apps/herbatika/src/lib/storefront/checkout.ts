"use client";

import { storefront } from "./storefront";

export const checkoutService = storefront.services.checkout;
export const checkoutQueryKeys = storefront.queryKeys.checkout;
export const checkoutHooks = storefront.hooks.checkout;
export const checkoutFlow = storefront.flows.checkout;

export const {
  useCheckoutShipping,
  useSuspenseCheckoutShipping,
  useCheckoutPayment,
  useSuspenseCheckoutPayment,
  getPaymentProvidersQueryOptions,
  fetchPaymentProviders,
} = checkoutHooks;

export const useCompleteCheckout = checkoutFlow.useCompleteCheckout;
