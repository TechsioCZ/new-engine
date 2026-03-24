"use client";

import type { HttpTypes } from "@medusajs/types";
import { useEffect, useRef } from "react";
import { storefront } from "./storefront";

const checkoutHooks = storefront.hooks.checkout;
const checkoutFlow = storefront.flows.checkout;

export const {
  getPaymentProvidersQueryOptions,
  fetchPaymentProviders,
} = checkoutHooks;

type CheckoutShippingInput = {
  cartId?: string;
  cart?: HttpTypes.StoreCart | null;
  enabled?: boolean;
  calculatePrices?: boolean;
};

type CheckoutShippingOptions = {
  onSuccess?: (cart: HttpTypes.StoreCart) => void;
  onError?: (error: unknown) => void;
};

type PendingShippingRequest = {
  resolve: (cart: HttpTypes.StoreCart) => void;
  reject: (error?: unknown) => void;
};

type CheckoutPaymentInput = {
  cartId?: string;
  cart?: HttpTypes.StoreCart | null;
  regionId?: string;
  enabled?: boolean;
};

type CheckoutPaymentOptions = {
  onSuccess?: (paymentCollection: HttpTypes.StorePaymentCollection) => void;
  onError?: (error: unknown) => void;
};

export const useCheckoutShipping = (
  input: CheckoutShippingInput,
  options?: CheckoutShippingOptions,
) => {
  const pendingRequestRef = useRef<PendingShippingRequest | null>(null);

  useEffect(() => {
    return () => {
      pendingRequestRef.current?.reject(
        new Error("Checkout shipping request was interrupted."),
      );
      pendingRequestRef.current = null;
    };
  }, []);

  const shipping = checkoutFlow.useCheckoutShipping(
    input.cartId,
    input.cart,
    {
      enabled: input.enabled,
      calculatePrices: input.calculatePrices,
      onSuccess: (cart) => {
        pendingRequestRef.current?.resolve(cart);
        pendingRequestRef.current = null;
        options?.onSuccess?.(cart);
      },
      onError: (error) => {
        pendingRequestRef.current?.reject(error);
        pendingRequestRef.current = null;
        options?.onError?.(error);
      },
    },
  );

  const setShippingMethod = (
    optionId: string,
    data?: Record<string, unknown>,
  ) => {
    shipping.setShipping(optionId, data);
  };

  const setShippingMethodAsync = (
    optionId: string,
    data?: Record<string, unknown>,
  ) => {
    if (optionId === shipping.selectedShippingMethodId && data === undefined) {
      return Promise.resolve(
        (input.cart ?? { id: input.cartId ?? "" }) as HttpTypes.StoreCart,
      );
    }

    return new Promise<HttpTypes.StoreCart>((resolve, reject) => {
      pendingRequestRef.current?.reject(
        new Error("A newer shipping selection replaced the previous request."),
      );
      pendingRequestRef.current = { resolve, reject };
      setShippingMethod(optionId, data);
    });
  };

  return {
    ...shipping,
    setShippingMethod,
    setShippingMethodAsync,
  };
};

export const useSuspenseCheckoutShipping = checkoutHooks.useSuspenseCheckoutShipping;

export const useCheckoutPayment = (
  input: CheckoutPaymentInput,
  options?: CheckoutPaymentOptions,
) => {
  return checkoutFlow.useCheckoutPayment(
    input.cartId,
    input.regionId,
    input.cart,
    {
      enabled: input.enabled,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    },
  );
};

export const useSuspenseCheckoutPayment = checkoutHooks.useSuspenseCheckoutPayment;

export const useCompleteCheckout = checkoutFlow.useCompleteCheckout;
