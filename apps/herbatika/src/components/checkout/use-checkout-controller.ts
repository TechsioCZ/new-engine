"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRegionContext } from "@techsio/storefront-data/shared/region-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/storefront/auth";
import {
  useCart,
  useUpdateCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart";
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter";
import {
  resolveCartSubtotalAmount,
  resolveCartTotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations";
import { fetchPaymentProviders } from "@/lib/storefront/checkout";
import {
  type CheckoutDetailsValues,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";
import { storefront } from "@/lib/storefront/storefront";
import { resolveHasStoredAddress } from "./checkout-address.utils";
import { useCheckoutActions } from "./use-checkout-actions";
import { useCheckoutDetailsForm } from "./use-checkout-details-form";

export function useCheckoutController() {
  const queryClient = useQueryClient();
  const region = useRegionContext();
  const authQuery = useAuth();
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [heurekaConsent, setHeurekaConsent] = useState(false);
  const saveAddressSucceededRef = useRef(false);

  const cartQuery = useCart({
    autoCreate: allowCartAutoCreate && !completedOrderId,
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

  const actions = useCheckoutActions({
    cartId: cartQuery.cart?.id,
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completedOrderId,
    completeCart: () => completeCheckoutMutation.mutateAsync(undefined),
    hasPaymentSessions: checkoutPaymentQuery.hasPaymentSessions,
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    itemCount: cartQuery.itemCount,
    onCompletedOrderIdChange: setCompletedOrderId,
    onOrderCompletionAbort: () => {
      setAllowCartAutoCreate(true);
    },
    onOrderCompletionStart: () => {
      setAllowCartAutoCreate(false);
    },
    onCheckoutErrorChange: setCheckoutError,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    setShippingMethod: checkoutShippingQuery.setShipping,
  });

  const checkoutDetailsForm = useCheckoutDetailsForm({
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isCartLoading: cartQuery.isLoading,
    isCustomerLoading: authQuery.isLoading,
    onSubmit: async (values) => {
      if (!cartQuery.cart?.id) {
        setCheckoutError("Košík nie je pripravený.");
        return;
      }

      const effectiveCheckoutDetails =
        resolveEffectiveCheckoutAddressDetails(values);

      try {
        await updateCartAddressMutation.mutateAsync({
          cartId: cartQuery.cart.id,
          email: values.shipping.email.trim(),
          shippingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveCheckoutDetails.shipping,
          ),
          billingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveCheckoutDetails.billing,
          ),
          useSameAddress: effectiveCheckoutDetails.useSameAddress,
        });
        saveAddressSucceededRef.current = true;
      } catch (error) {
        setCheckoutError(
          resolveErrorMessage(error, "Uloženie adresy zlyhalo."),
        );
      }
    },
    regionCountryCode: region?.country_code,
  });

  const handleSaveAddress = async () => {
    actions.resetFeedback();
    saveAddressSucceededRef.current = false;
    await checkoutDetailsForm.form.handleSubmit();

    if (saveAddressSucceededRef.current) {
      checkoutDetailsForm.resetToValues(
        checkoutDetailsForm.form.state.values as CheckoutDetailsValues,
      );
    }

    return saveAddressSucceededRef.current;
  };

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
    billingAddressForm: checkoutDetailsForm.effectiveValues.billing,
    cartItems,
    cartQuery,
    cartSubtotalAmount,
    cartTotalWithoutTaxAmount,
    cartTotalAmount,
    checkoutDetailsForm,
    checkoutError,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completedOrderId,
    completeCheckoutMutation,
    currencyCode,
    handleSaveAddress,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    heurekaConsent,
    isAuthenticated: authQuery.isAuthenticated,
    isBusy,
    isCompanyPurchase: checkoutDetailsForm.values.isCompanyPurchase,
    marketingConsent,
    selectedShippingPrice,
    setHeurekaConsent,
    setMarketingConsent,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
    canCompleteOrder:
      !isBusy &&
      Boolean(checkoutShippingQuery.selectedShippingMethodId) &&
      checkoutPaymentQuery.hasPaymentSessions,
  };
}

export type CheckoutController = ReturnType<typeof useCheckoutController>;
