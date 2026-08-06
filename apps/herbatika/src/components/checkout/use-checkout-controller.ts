"use client"

import { useRef, useState } from "react"

import { resolveEffectiveCheckoutAddressDetails } from "@/lib/forms/checkout/address.form"
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import {
  buildAccountSetupRequestedMetadata,
  isRecord,
  readAccountSetupRequested,
} from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { resolveOrderId } from "./checkout-completion.utils"
import {
  clearStoredPaymentProviderSelection,
  writeStoredPaymentProviderSelection,
} from "./checkout-payment-selection-storage"
import { resolveCheckoutSummary } from "./checkout-summary.utils"
import { isCheckoutCountryAvailableForRegion } from "./checkout.constants"
import { useCheckoutActions } from "./use-checkout-actions"
import { useCheckoutDetailsForm } from "./use-checkout-details-form"
import { useCheckoutRuntime } from "./use-checkout-runtime"

const resolveCompleteResultOrderMetadata = (result: unknown): unknown => {
  if (!isRecord(result)) {
    return null
  }
  const order: unknown = Reflect.get(result, "order")
  if (!isRecord(order)) {
    return null
  }
  const metadata: unknown = Reflect.get(order, "metadata")
  return metadata
}

export const useCheckoutController = () => {
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [heurekaConsent, setHeurekaConsent] = useState(false)
  const saveAddressSucceededRef = useRef(false)
  const {
    activeRegionId,
    authQuery,
    cartQuery,
    checkoutError,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completeCheckoutMutation,
    countryItems,
    effectiveSelectedPaymentProviderId,
    region,
    regionCurrencyCode,
    regionsQuery,
    setCheckoutError,
    tCheckout,
    updateCartAddressMutation,
    updateCartMutation,
  } = useCheckoutRuntime({ allowCartAutoCreate, completedOrderId })

  const actions = useCheckoutActions({
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    cart: cartQuery.cart,
    ...(cartQuery.cart?.id === undefined ? {} : { cartId: cartQuery.cart?.id }),
    completeCart: async () => {
      logCheckoutAccountSetupDebug("complete cart invoked", {
        cart_id: cartQuery.cart?.id ?? null,
        cart_metadata_requested: readAccountSetupRequested(
          cartQuery.cart?.metadata,
        ),
      })

      const completeResult = await completeCheckoutMutation.mutateAsync(
        cartQuery.cart?.id === undefined ? {} : { cartId: cartQuery.cart?.id },
      )

      logCheckoutAccountSetupDebug("complete cart returned", {
        has_order_metadata:
          resolveCompleteResultOrderMetadata(completeResult) !== null,
        has_result: Boolean(completeResult),
        order_id: resolveOrderId(completeResult),
        order_metadata_requested: readAccountSetupRequested(
          resolveCompleteResultOrderMetadata(completeResult),
        ),
      })

      return completeResult
    },
    completedOrderId,
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    itemCount: cartQuery.itemCount,
    onCheckoutErrorChange: setCheckoutError,
    onCompletedOrderIdChange: (orderId) => {
      if (orderId !== null && orderId.length > 0) {
        clearStoredPaymentProviderSelection(cartQuery.cart?.id)
      }
      setCompletedOrderId(orderId)
    },
    onOrderCompletionAbort: () => {
      setAllowCartAutoCreate(true)
    },
    onOrderCompletionStart: () => {
      setAllowCartAutoCreate(false)
    },
    onPaymentProviderSelect: (providerId) => {
      writeStoredPaymentProviderSelection({
        ...(cartQuery.cart?.id === undefined
          ? {}
          : { cartId: cartQuery.cart?.id }),
        providerId,
      })
    },
    onPaymentRedirect: (url) => {
      window.location.assign(url)
    },
    refreshCart: async () => {
      const result = await cartQuery.query.refetch()
      return result.data ?? null
    },
    ...(effectiveSelectedPaymentProviderId === undefined
      ? {}
      : { selectedPaymentProviderId: effectiveSelectedPaymentProviderId }),
    selectedShippingMethodId:
      checkoutShippingQuery.selectedShippingMethodId ?? null,
    setShippingMethod: checkoutShippingQuery.setShipping,
  })

  const checkoutDetailsForm = useCheckoutDetailsForm({
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isCartLoading: cartQuery.isLoading,
    isCustomerLoading: authQuery.isLoading,
    onSubmit: async (values) => {
      if (cartQuery.cart?.id === undefined || cartQuery.cart.id.length === 0) {
        setCheckoutError(tCheckout("cart_not_ready"))
        return
      }

      const effectiveCheckoutDetails =
        resolveEffectiveCheckoutAddressDetails(values)
      const hasSupportedShippingCountry = isCheckoutCountryAvailableForRegion({
        ...(region?.country_code === undefined
          ? {}
          : { activeCountryCode: region?.country_code }),
        countryCode: effectiveCheckoutDetails.shipping.countryCode,
        ...(activeRegionId === undefined ? {} : { regionId: activeRegionId }),
        regions: regionsQuery.regions,
      })
      const hasSupportedBillingCountry = isCheckoutCountryAvailableForRegion({
        ...(region?.country_code === undefined
          ? {}
          : { activeCountryCode: region?.country_code }),
        countryCode: effectiveCheckoutDetails.billing.countryCode,
        ...(activeRegionId === undefined ? {} : { regionId: activeRegionId }),
        regions: regionsQuery.regions,
      })

      if (!(hasSupportedShippingCountry && hasSupportedBillingCountry)) {
        setCheckoutError(tCheckout("country_unavailable"))
        return
      }

      try {
        const accountSetupMetadata = buildAccountSetupRequestedMetadata(
          cartQuery.cart.metadata,
          !authQuery.isAuthenticated && values.accountSetupRequested,
        )

        logCheckoutAccountSetupDebug("address submit update cart request", {
          cart_id: cartQuery.cart.id,
          current_metadata_requested: readAccountSetupRequested(
            cartQuery.cart.metadata,
          ),
          form_requested: values.accountSetupRequested,
          is_authenticated: authQuery.isAuthenticated,
          payload_metadata_requested:
            readAccountSetupRequested(accountSetupMetadata),
        })

        const updatedCart = await updateCartAddressMutation.mutateAsync({
          billingAddress: {
            ...buildHerbatikaCheckoutAddressInput(
              effectiveCheckoutDetails.billing,
            ),
          },
          cartId: cartQuery.cart.id,
          email: values.shipping.email.trim(),
          metadata: accountSetupMetadata,
          shippingAddress: {
            ...buildHerbatikaCheckoutAddressInput(
              effectiveCheckoutDetails.shipping,
            ),
          },
          useSameAddress: effectiveCheckoutDetails.useSameAddress,
        })

        logCheckoutAccountSetupDebug("address submit update cart response", {
          cart_id: updatedCart.id,
          response_metadata_requested: readAccountSetupRequested(
            updatedCart.metadata,
          ),
        })

        saveAddressSucceededRef.current = true
      } catch (error) {
        setCheckoutError(
          resolveErrorMessage(error, tCheckout("address_update_failed")),
        )
      }
    },
    ...(region?.country_code === undefined
      ? {}
      : { regionCountryCode: region.country_code }),
  })

  const handleSaveAddress = async () => {
    actions.resetFeedback()
    saveAddressSucceededRef.current = false
    await checkoutDetailsForm.form.handleSubmit()

    if (saveAddressSucceededRef.current) {
      checkoutDetailsForm.resetToValues(checkoutDetailsForm.form.state.values)
    }

    return saveAddressSucceededRef.current
  }

  const syncAccountSetupPreference = async () => {
    const { cart } = cartQuery

    if (cart?.id === undefined || cart.id.length === 0) {
      setCheckoutError(tCheckout("cart_not_ready"))
      return false
    }

    const requested =
      !authQuery.isAuthenticated &&
      checkoutDetailsForm.values.accountSetupRequested

    logCheckoutAccountSetupDebug("complete order metadata sync entered", {
      cart_id: cart.id,
      current_metadata_requested: readAccountSetupRequested(cart.metadata),
      form_requested: checkoutDetailsForm.values.accountSetupRequested,
      is_authenticated: authQuery.isAuthenticated,
      requested,
    })

    if (readAccountSetupRequested(cart.metadata) === requested) {
      logCheckoutAccountSetupDebug("complete order metadata already synced", {
        cart_id: cart.id,
        requested,
      })
      return true
    }

    try {
      const updatedCart = await updateCartMutation.mutateAsync({
        cartId: cart.id,
        metadata: buildAccountSetupRequestedMetadata(cart.metadata, requested),
      })

      logCheckoutAccountSetupDebug("complete order metadata sync response", {
        cart_id: updatedCart.id,
        response_metadata_requested: readAccountSetupRequested(
          updatedCart.metadata,
        ),
      })

      return true
    } catch (error) {
      setCheckoutError(
        resolveErrorMessage(error, tCheckout("registration_update_failed")),
      )
      return false
    }
  }

  const handleCompleteOrder = async () => {
    const didSyncAccountSetup = await syncAccountSetupPreference()

    logCheckoutAccountSetupDebug("handle complete order sync verdict", {
      did_sync_account_setup: didSyncAccountSetup,
    })

    if (!didSyncAccountSetup) {
      return
    }

    await actions.handleCompleteOrder()
  }

  const {
    canCompleteOrder,
    cartItems,
    cartItemsSubtotalAmount,
    cartItemsTotalAmount,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount,
    cartTotalAmount,
    cartTotalWithoutTaxAmount,
    currencyCode,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    isBusy,
  } = resolveCheckoutSummary({
    cart: cartQuery.cart,
    effectiveSelectedPaymentProviderId,
    itemCount: cartQuery.itemCount,
    pendingStates: [
      cartQuery.isFetching,
      regionsQuery.isLoading,
      regionsQuery.isFetching,
      updateCartAddressMutation.isPending,
      updateCartMutation.isPending,
      checkoutShippingQuery.isSettingShipping,
      checkoutPaymentQuery.isInitiatingPayment,
      completeCheckoutMutation.isPending,
    ],
    regionCurrencyCode,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    shippingPrices: checkoutShippingQuery.shippingPrices,
  })

  return {
    ...actions,
    billingAddressForm: checkoutDetailsForm.effectiveValues.billing,
    canCompleteOrder,
    cartItems,
    cartItemsSubtotalAmount,
    cartItemsTotalAmount,
    cartQuery,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount,
    cartTotalAmount,
    cartTotalWithoutTaxAmount,
    checkoutDetailsForm,
    checkoutError,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completeCheckoutMutation,
    completedOrderId,
    countryItems,
    currencyCode,
    handleCompleteOrder,
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
    selectedPaymentProviderId: effectiveSelectedPaymentProviderId,
    setHeurekaConsent,
    setMarketingConsent,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
  }
}

export type CheckoutController = ReturnType<typeof useCheckoutController>
