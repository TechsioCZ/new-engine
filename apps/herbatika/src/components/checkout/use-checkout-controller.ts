"use client"
import { useQueryClient } from "@tanstack/react-query"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"
import { useState } from "react"

import { useAuth } from "@/lib/storefront/auth"
import { useCart } from "@/lib/storefront/cart"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { useRegions } from "@/lib/storefront/regions"
import { storefront } from "@/lib/storefront/storefront"

import { isRecord, readAccountSetupRequested } from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { resolveHasStoredAddress } from "./checkout-address.utils"
import { createCheckoutCompletionHandler } from "./checkout-completion-handler"
import { resolveOrderId } from "./checkout-completion.utils"
import { resolveCheckoutControllerState } from "./checkout-controller-state"
import { resolveCheckoutCartSummary } from "./checkout-controller-summary"
import {
  clearStoredPaymentProviderSelection,
  writeStoredPaymentProviderSelection,
} from "./checkout-payment-selection-storage"
import { resolveCheckoutCountryItemsForRegion } from "./checkout.constants"
import { useCheckoutActions } from "./use-checkout-actions"
import { useCheckoutAddressDetails } from "./use-checkout-address-details"
import { useCheckoutPaymentQueries } from "./use-checkout-payment-queries"

const resolveCompleteResultOrderMetadata = (result: unknown) =>
  isRecord(result) && isRecord(result["order"])
    ? result["order"]["metadata"]
    : null

export function useCheckoutController() {
  const queryClient = useQueryClient()
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const authQuery = useAuth()
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [heurekaConsent, setHeurekaConsent] = useState(false)

  const cartQuery = useCart({
    autoCreate: allowCartAutoCreate && !completedOrderId,
    ...(region?.region_id === undefined ? {} : { region_id: region.region_id }),
    ...(region?.country_code === undefined
      ? {}
      : { country_code: region.country_code }),
    enabled: Boolean(region?.region_id),
  })
  const activeRegionId = cartQuery.cart?.region_id ?? region?.region_id
  const regionsQuery = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const completeCheckoutMutation = storefront.flows.cart.useCompleteCart()

  const checkoutShippingQuery = storefront.flows.checkout.useCheckoutShipping(
    cartQuery.cart?.id,
    cartQuery.cart,
    {
      enabled: Boolean(cartQuery.cart?.id),
      onError: (error) => {
        setCheckoutError(
          resolveErrorMessage(error, tCheckout("shipping_update_failed"))
        )
      },
    }
  )

  const { checkoutPaymentQuery, selectedPaymentProviderId } =
    useCheckoutPaymentQueries({
      ...(activeRegionId === undefined ? {} : { activeRegionId }),
      cart: cartQuery.cart,
      queryClient,
    })

  const countryItems = useMemo(
    () =>
      resolveCheckoutCountryItemsForRegion({
        activeCountryCode: region?.country_code,
        locale: marketContext.locale,
        regionId: activeRegionId,
        regions: regionsQuery.regions,
      }),
    [
      activeRegionId,
      marketContext.locale,
      region?.country_code,
      regionsQuery.regions,
    ]
  )

  const actions = useCheckoutActions({
    cart: cartQuery.cart,
    ...(cartQuery.cart?.id === undefined ? {} : { cartId: cartQuery.cart?.id }),
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completedOrderId,
    completeCart: async () => {
      logCheckoutAccountSetupDebug("complete cart invoked", {
        cart_id: cartQuery.cart?.id ?? null,
        cart_metadata_requested: readAccountSetupRequested(
          cartQuery.cart?.metadata
        ),
      })

      const cartId = cartQuery.cart?.id
      const completeResult = await completeCheckoutMutation.mutateAsync(
        cartId === undefined ? {} : { cartId }
      )

      logCheckoutAccountSetupDebug("complete cart returned", {
        has_result: Boolean(completeResult),
        has_order_metadata:
          resolveCompleteResultOrderMetadata(completeResult) !== null,
        order_id: resolveOrderId(completeResult),
        order_metadata_requested: readAccountSetupRequested(
          resolveCompleteResultOrderMetadata(completeResult)
        ),
      })

      return completeResult
    },
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    itemCount: cartQuery.itemCount,
    onCompletedOrderIdChange: (orderId) => {
      if (orderId) {
        clearStoredPaymentProviderSelection(cartQuery.cart?.id)
      }
      setCompletedOrderId(orderId)
    },
    onOrderCompletionAbort: () => setAllowCartAutoCreate(true),
    onOrderCompletionStart: () => setAllowCartAutoCreate(false),
    onCheckoutErrorChange: setCheckoutError,
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
    ...(selectedPaymentProviderId === undefined
      ? {}
      : { selectedPaymentProviderId }),
    ...(checkoutShippingQuery.selectedShippingMethodId === undefined
      ? {}
      : {
          selectedShippingMethodId:
            checkoutShippingQuery.selectedShippingMethodId,
        }),
    setShippingMethod: checkoutShippingQuery.setShipping,
  })

  const {
    checkoutDetailsForm,
    handleSaveAddress,
    syncAccountSetupPreference,
    updateCartAddressMutation,
    updateCartMutation,
  } = useCheckoutAddressDetails({
    ...(region?.country_code === undefined
      ? {}
      : { activeCountryCode: region.country_code }),
    ...(activeRegionId === undefined ? {} : { activeRegionId }),
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isAuthenticated: authQuery.isAuthenticated,
    isCartLoading: cartQuery.isLoading,
    isCustomerLoading: authQuery.isLoading,
    onSubmit: async (values) => {
      if (!cartQuery.cart?.id) {
        setCheckoutError(tCheckout("cart_not_ready"))
        return
      }

      const effectiveCheckoutDetails =
        resolveEffectiveCheckoutAddressDetails(values)
      const hasSupportedShippingCountry = isCheckoutCountryAvailableForRegion({
        activeCountryCode: region?.country_code,
        countryCode: effectiveCheckoutDetails.shipping.countryCode,
        regionId: activeRegionId,
        regions: regionsQuery.regions,
      })
      const hasSupportedBillingCountry = isCheckoutCountryAvailableForRegion({
        activeCountryCode: region?.country_code,
        countryCode: effectiveCheckoutDetails.billing.countryCode,
        regionId: activeRegionId,
        regions: regionsQuery.regions,
      })

      if (!(hasSupportedShippingCountry && hasSupportedBillingCountry)) {
        setCheckoutError(tCheckout("country_unavailable"))
        return
      }

      try {
        const accountSetupMetadata = buildAccountSetupRequestedMetadata(
          cartQuery.cart.metadata,
          !authQuery.isAuthenticated && values.accountSetupRequested
        )

        logCheckoutAccountSetupDebug("address submit update cart request", {
          cart_id: cartQuery.cart.id,
          current_metadata_requested: readAccountSetupRequested(
            cartQuery.cart.metadata
          ),
          form_requested: values.accountSetupRequested,
          is_authenticated: authQuery.isAuthenticated,
          payload_metadata_requested:
            readAccountSetupRequested(accountSetupMetadata),
        })

        const updatedCart = await updateCartAddressMutation.mutateAsync({
          cartId: cartQuery.cart.id,
          email: values.shipping.email.trim(),
          metadata: accountSetupMetadata,
          shippingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveCheckoutDetails.shipping
          ),
          billingAddress: buildHerbatikaCheckoutAddressInput(
            effectiveCheckoutDetails.billing
          ),
          useSameAddress: effectiveCheckoutDetails.useSameAddress,
        })

        logCheckoutAccountSetupDebug("address submit update cart response", {
          cart_id: updatedCart.id,
          response_metadata_requested: readAccountSetupRequested(
            updatedCart.metadata
          ),
        })

        saveAddressSucceededRef.current = true
      } catch (error) {
        setCheckoutError(
          resolveErrorMessage(error, tCheckout("address_update_failed"))
        )
      }
    },
    regionCountryCode: region?.country_code,
  })

  const handleSaveAddress = async () => {
    actions.resetFeedback()
    saveAddressSucceededRef.current = false
    await checkoutDetailsForm.form.handleSubmit()

    if (saveAddressSucceededRef.current) {
      checkoutDetailsForm.resetToValues(
        checkoutDetailsForm.form.state.values as CheckoutDetailsValues
      )
    }

    return saveAddressSucceededRef.current
  }

  const syncAccountSetupPreference = async () => {
    const cart = cartQuery.cart

    if (!cart?.id) {
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
          updatedCart.metadata
        ),
      })

      return true
    } catch (error) {
      setCheckoutError(
        resolveErrorMessage(error, tCheckout("registration_update_failed"))
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

  const currencyCode = resolveSupportedCurrencyCode(
    cartQuery.cart?.currency_code,
    resolveRegionCurrency(region)
  )

  const hasStoredAddress = resolveHasStoredAddress(cartQuery.cart)
  const hasPayment = Boolean(selectedPaymentProviderId)
  const selectedShippingMethodId =
    checkoutShippingQuery.selectedShippingMethodId
  const cartSummary = resolveCheckoutCartSummary({
    cart: cartQuery.cart,
    ...(selectedShippingMethodId === undefined
      ? {}
      : { selectedShippingMethodId }),
    shippingPrices: checkoutShippingQuery.shippingPrices,
  })

  const { cartItems, hasItems, hasShipping, isBusy } =
    resolveCheckoutControllerState({
      cartItems: cartQuery.cart?.items,
      itemCount: cartQuery.itemCount,
      cartFetching: cartQuery.isFetching,
      regionsLoading: regionsQuery.isLoading,
      regionsFetching: regionsQuery.isFetching,
      updateCartAddressPending: updateCartAddressMutation.isPending,
      updateCartPending: updateCartMutation.isPending,
      settingShipping: checkoutShippingQuery.isSettingShipping,
      initiatingPayment: checkoutPaymentQuery.isInitiatingPayment,
      completeCheckoutPending: completeCheckoutMutation.isPending,
      ...(checkoutShippingQuery.selectedShippingMethodId === undefined
        ? {}
        : {
            selectedShippingMethodId:
              checkoutShippingQuery.selectedShippingMethodId,
          }),
    })

  return {
    ...actions,
    billingAddressForm: checkoutDetailsForm.effectiveValues.billing,
    cartItems,
    cartQuery,
    ...cartSummary,
    checkoutDetailsForm,
    checkoutError,
    countryItems,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completedOrderId,
    completeCheckoutMutation,
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
    selectedPaymentProviderId,
    setHeurekaConsent,
    setMarketingConsent,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
    canCompleteOrder:
      !isBusy && hasShipping && Boolean(selectedPaymentProviderId),
  }
}

export type CheckoutController = ReturnType<typeof useCheckoutController>
