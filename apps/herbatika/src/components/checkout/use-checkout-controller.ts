"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/storefront/auth";
import {
  resolveCartSubtotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations";
import {
  fetchPaymentProviders,
  useCompleteCheckout,
  useCheckoutPayment,
  useCheckoutShipping,
} from "@/lib/storefront/checkout";
import {
  useCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart";
import { CHECKOUT_STEPS } from "./checkout.constants";
import { useCheckoutActions } from "./use-checkout-actions";
import { useCheckoutFormState } from "./use-checkout-form-state";
import {
  resolveCartTotalAmount,
  resolveHasStoredAddress,
  resolveCheckoutStepIndex,
} from "./checkout.utils";

export function useCheckoutController() {
  const queryClient = useQueryClient();
  const region = useRegionContext();
  const authQuery = useAuth();

  const cartQuery = useCart({
    autoCreate: true,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });
  const activeRegionId = cartQuery.cart?.region_id ?? region?.region_id;

  const updateCartAddressMutation = useUpdateCartAddress();
  const completeCheckoutMutation = useCompleteCheckout({
    cartId: cartQuery.cart?.id,
    regionId: activeRegionId,
    enabled: Boolean(activeRegionId),
  });
  const isUpdatingCartAddress = updateCartAddressMutation.isPending;
  const mutateCartAddress = updateCartAddressMutation.mutate;

  const checkoutShippingQuery = useCheckoutShipping({
    cartId: cartQuery.cart?.id,
    enabled: Boolean(cartQuery.cart?.id),
  });

  const checkoutPaymentQuery = useCheckoutPayment({
    cartId: cartQuery.cart?.id,
    regionId: activeRegionId,
    enabled: Boolean(activeRegionId),
  });

  useEffect(() => {
    const cartId = cartQuery.cart?.id;
    const regionCountryCode = region?.country_code?.toLowerCase();
    const cartCountryCode =
      cartQuery.cart?.shipping_address?.country_code?.toLowerCase() ?? null;

    if (!cartId || !regionCountryCode) {
      return;
    }

    // Keep existing customer-entered country intact; only backfill missing value
    // so Medusa can calculate taxes in cart/checkout summary.
    if (cartCountryCode || isUpdatingCartAddress) {
      return;
    }

    mutateCartAddress({
      cartId,
      shippingAddress: { country_code: regionCountryCode },
      useSameAddress: true,
    });
  }, [
    cartQuery.cart?.id,
    cartQuery.cart?.shipping_address?.country_code,
    region?.country_code,
    isUpdatingCartAddress,
    mutateCartAddress,
  ]);

  useEffect(() => {
    if (!activeRegionId) {
      return;
    }

    void fetchPaymentProviders(queryClient, activeRegionId).catch(() => {
      // Best-effort prefetch only.
    });
  }, [activeRegionId, queryClient]);

  const formState = useCheckoutFormState({
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isCartLoading: cartQuery.isLoading,
    regionCountryCode: region?.country_code,
  });

  const actions = useCheckoutActions({
    addressForm: formState.addressForm,
    cartId: cartQuery.cart?.id,
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completeCart: async () => completeCheckoutMutation.mutateAsync(undefined),
    hasPaymentSessions: checkoutPaymentQuery.hasPaymentSessions,
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    isCompanyPurchase: formState.isCompanyPurchase,
    itemCount: cartQuery.itemCount,
    saveAddress: updateCartAddressMutation.mutateAsync,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    setShippingMethod: checkoutShippingQuery.setShippingMethodAsync,
  });

  const currencyCode = useMemo(() => {
    return (cartQuery.cart?.currency_code ?? "eur").toUpperCase();
  }, [cartQuery.cart?.currency_code]);

  const cartItems = cartQuery.cart?.items ?? [];
  const hasItems = cartQuery.itemCount > 0 || cartItems.length > 0;
  const hasStoredAddress = resolveHasStoredAddress(cartQuery.cart);
  const hasShipping = Boolean(checkoutShippingQuery.selectedShippingMethodId);
  const hasPayment = checkoutPaymentQuery.hasPaymentSessions;
  const checkoutStepIndex = resolveCheckoutStepIndex({
    hasItems,
    hasStoredAddress,
    hasShipping,
    hasPayment,
  });

  const selectedShippingPrice = useMemo(() => {
    if (!checkoutShippingQuery.selectedShippingMethodId) {
      return 0;
    }

    return (
      checkoutShippingQuery.shippingPrices[
        checkoutShippingQuery.selectedShippingMethodId
      ] ?? 0
    );
  }, [
    checkoutShippingQuery.selectedShippingMethodId,
    checkoutShippingQuery.shippingPrices,
  ]);

  const cartSubtotalAmount = useMemo(() => {
    return resolveCartSubtotalAmount(cartQuery.cart);
  }, [cartQuery.cart]);

  const cartTotalAmount = useMemo(() => {
    return resolveCartTotalAmount(cartQuery.cart);
  }, [cartQuery.cart]);
  const cartTotalWithoutTaxAmount = useMemo(() => {
    return resolveCartTotalWithoutTaxAmount(cartQuery.cart);
  }, [cartQuery.cart]);

  const isBusy =
    cartQuery.isFetching ||
    updateCartAddressMutation.isPending ||
    checkoutShippingQuery.isSettingShipping ||
    checkoutPaymentQuery.isInitiatingPayment ||
    completeCheckoutMutation.isPending;

  return {
    ...actions,
    ...formState,
    cartItems,
    cartQuery,
    cartSubtotalAmount,
    cartTotalWithoutTaxAmount,
    cartTotalAmount,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    checkoutStepIndex,
    completeCartMutation: completeCheckoutMutation,
    completeCheckoutMutation,
    currencyCode,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    isBusy,
    selectedShippingPrice,
    updateCartAddressMutation,
    canCompleteOrder:
      !isBusy &&
      Boolean(checkoutShippingQuery.selectedShippingMethodId) &&
      checkoutPaymentQuery.hasPaymentSessions,
    checkoutSteps: CHECKOUT_STEPS,
  };
}

export type CheckoutController = ReturnType<typeof useCheckoutController>;
