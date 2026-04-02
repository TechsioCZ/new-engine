"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/storefront/auth";
import {
  useCart,
  useUpdateCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart";
import {
  resolveCartSubtotalAmount,
  resolveCartTotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations";
import {
  fetchPaymentProviders,
} from "@/lib/storefront/checkout";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { storefront } from "@/lib/storefront/storefront";
import { resolveHasStoredAddress } from "./checkout-address.utils";
import { useCheckoutActions } from "./use-checkout-actions";
import { useCheckoutFormState } from "./use-checkout-form-state";

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

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const updateCartAddressMutation = useUpdateCartAddress();
  const updateCartMutation = useUpdateCart();
  const completeCheckoutMutation = storefront.flows.checkout.useCompleteCheckout({
    cartId: cartQuery.cart?.id,
    regionId: activeRegionId,
    enabled: Boolean(activeRegionId),
  });
  const isUpdatingCartAddress = updateCartAddressMutation.isPending;
  const isBackfillingCartCountry = updateCartMutation.isPending;
  const mutateCart = updateCartMutation.mutate;

  const checkoutShippingQuery = storefront.flows.checkout.useCheckoutShipping(
    cartQuery.cart?.id,
    cartQuery.cart,
    {
      enabled: Boolean(cartQuery.cart?.id),
      onError: (error) => {
        setCheckoutError(
          resolveErrorMessage(error, "Nastavenie dopravy zlyhalo."),
        );
      },
    },
  );

  const checkoutPaymentQuery = storefront.flows.checkout.useCheckoutPayment(
    cartQuery.cart?.id,
    activeRegionId,
    cartQuery.cart,
    {
      enabled: Boolean(activeRegionId),
    },
  );

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
    if (cartCountryCode || isUpdatingCartAddress || isBackfillingCartCountry) {
      return;
    }

    mutateCart({
      cartId,
      country_code: regionCountryCode,
    });
  }, [
    cartQuery.cart?.id,
    cartQuery.cart?.shipping_address?.country_code,
    region?.country_code,
    isBackfillingCartCountry,
    isUpdatingCartAddress,
    mutateCart,
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
    isCustomerLoading: authQuery.isLoading,
    regionCountryCode: region?.country_code,
  });

  const actions = useCheckoutActions({
    addressForm: formState.addressForm,
    cartId: cartQuery.cart?.id,
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completeCart: () => completeCheckoutMutation.mutateAsync(undefined),
    hasPaymentSessions: checkoutPaymentQuery.hasPaymentSessions,
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    isCompanyPurchase: formState.isCompanyPurchase,
    itemCount: cartQuery.itemCount,
    onCheckoutErrorChange: setCheckoutError,
    saveAddress: updateCartAddressMutation.mutateAsync,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    setShippingMethod: checkoutShippingQuery.setShipping,
  });

  const currencyCode = useMemo(() => {
    return (cartQuery.cart?.currency_code ?? "eur").toUpperCase();
  }, [cartQuery.cart?.currency_code]);

  const cartItems = cartQuery.cart?.items ?? [];
  const hasItems = cartQuery.itemCount > 0 || cartItems.length > 0;
  const hasStoredAddress = resolveHasStoredAddress(cartQuery.cart);
  const hasShipping = Boolean(checkoutShippingQuery.selectedShippingMethodId);
  const hasPayment = checkoutPaymentQuery.hasPaymentSessions;

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
    checkoutError,
    completeCheckoutMutation,
    currencyCode,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    isAuthenticated: authQuery.isAuthenticated,
    isBusy,
    selectedShippingPrice,
    updateCartAddressMutation,
    canCompleteOrder:
      !isBusy &&
      Boolean(checkoutShippingQuery.selectedShippingMethodId) &&
      checkoutPaymentQuery.hasPaymentSessions,
  };
}

export type CheckoutController = ReturnType<typeof useCheckoutController>;
