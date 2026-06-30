"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useEffect, useRef, useState } from "react"
import {
  type CheckoutDetailsValues,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form"
import { useAuth } from "@/lib/storefront/auth"
import {
  useCart,
  useUpdateCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart"
import { buildHerbatikaCheckoutAddressInput } from "@/lib/storefront/cart/address-adapter"
import {
  resolveCartItemsSubtotalAmount,
  resolveCartItemsTotalAmount,
  resolveCartShippingTotalAmount,
  resolveCartTaxAmount,
  resolveCartTotalAmount,
  resolveCartTotalWithoutTaxAmount,
} from "@/lib/storefront/cart-calculations"
import { resolveCartShippingSubtotalAmount } from "@/lib/storefront/cart-tax-calculations"
import {
  fetchPaymentProviders,
  resolveSelectedPaymentProviderId,
} from "@/lib/storefront/checkout"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { useRegions } from "@/lib/storefront/regions"
import { storefront } from "@/lib/storefront/storefront"
import {
  buildAccountSetupRequestedMetadata,
  isRecord,
  readAccountSetupRequested,
} from "./account-setup-metadata"
import {
  isCheckoutCountryAvailableForRegion,
  resolveCheckoutCountryItemsForRegion,
} from "./checkout.constants"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { resolveHasStoredAddress } from "./checkout-address.utils"
import { resolveOrderId } from "./checkout-completion.utils"
import {
  clearStoredPaymentProviderSelection,
  useStoredPaymentProviderSelection,
  writeStoredPaymentProviderSelection,
} from "./checkout-payment-selection-storage"
import { useCheckoutActions } from "./use-checkout-actions"
import { useCheckoutDetailsForm } from "./use-checkout-details-form"

const resolveCompleteResultOrderMetadata = (result: unknown) => {
  if (!(isRecord(result) && isRecord(result.order))) {
    return null
  }

  return result.order.metadata
}

export function useCheckoutController() {
  const queryClient = useQueryClient()
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const authQuery = useAuth()
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [heurekaConsent, setHeurekaConsent] = useState(false)
  const saveAddressSucceededRef = useRef(false)

  const cartQuery = useCart({
    autoCreate: allowCartAutoCreate && !completedOrderId,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  })
  const activeRegionId = cartQuery.cart?.region_id ?? region?.region_id
  const regionsQuery = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const updateCartAddressMutation = useUpdateCartAddress()
  const updateCartMutation = useUpdateCart()
  const completeCheckoutMutation = storefront.flows.cart.useCompleteCart()
  const isUpdatingCartAddress = updateCartAddressMutation.isPending
  const isUpdatingCart = updateCartMutation.isPending
  const mutateCart = updateCartMutation.mutate

  const checkoutShippingQuery = storefront.flows.checkout.useCheckoutShipping(
    cartQuery.cart?.id,
    cartQuery.cart,
    {
      enabled: Boolean(cartQuery.cart?.id),
      onError: (error) => {
        setCheckoutError(
          resolveErrorMessage(error, "Nastavenie dopravy zlyhalo.")
        )
      },
    }
  )

  const checkoutPaymentQuery = storefront.flows.checkout.useCheckoutPayment(
    cartQuery.cart?.id,
    activeRegionId,
    cartQuery.cart,
    {
      enabled: Boolean(activeRegionId),
    }
  )
  const cartSelectedPaymentProviderId = resolveSelectedPaymentProviderId(
    cartQuery.cart
  )
  const storedPaymentProviderId = useStoredPaymentProviderSelection(
    cartQuery.cart?.id
  )
  const effectiveSelectedPaymentProviderId =
    storedPaymentProviderId ?? cartSelectedPaymentProviderId

  useEffect(() => {
    const cartId = cartQuery.cart?.id
    const regionCountryCode = region?.country_code?.toLowerCase()
    const cartCountryCode =
      cartQuery.cart?.shipping_address?.country_code?.toLowerCase() ?? null

    if (!(cartId && regionCountryCode)) {
      return
    }

    if (cartCountryCode || isUpdatingCartAddress || isUpdatingCart) {
      return
    }

    mutateCart({
      cartId,
      country_code: regionCountryCode,
    })
  }, [
    cartQuery.cart?.id,
    cartQuery.cart?.shipping_address?.country_code,
    region?.country_code,
    isUpdatingCart,
    isUpdatingCartAddress,
    mutateCart,
  ])

  useEffect(() => {
    if (!activeRegionId) {
      return
    }

    runDetachedPromise(
      fetchPaymentProviders(queryClient, activeRegionId),
      () => {
        // Best-effort prefetch only.
      }
    )
  }, [activeRegionId, queryClient])

  const countryItems = resolveCheckoutCountryItemsForRegion({
    activeCountryCode: region?.country_code,
    regionId: activeRegionId,
    regions: regionsQuery.regions,
  })

  const actions = useCheckoutActions({
    cart: cartQuery.cart,
    cartId: cartQuery.cart?.id,
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completedOrderId,
    completeCart: async () => {
      logCheckoutAccountSetupDebug("complete cart invoked", {
        cart_id: cartQuery.cart?.id ?? null,
        cart_metadata_requested: readAccountSetupRequested(
          cartQuery.cart?.metadata
        ),
      })

      const completeResult = await completeCheckoutMutation.mutateAsync({
        cartId: cartQuery.cart?.id,
      })

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
    onOrderCompletionAbort: () => {
      setAllowCartAutoCreate(true)
    },
    onOrderCompletionStart: () => {
      setAllowCartAutoCreate(false)
    },
    onCheckoutErrorChange: setCheckoutError,
    onPaymentProviderSelect: (providerId) => {
      writeStoredPaymentProviderSelection({
        cartId: cartQuery.cart?.id,
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
    selectedPaymentProviderId: effectiveSelectedPaymentProviderId,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    setShippingMethod: checkoutShippingQuery.setShipping,
  })

  const checkoutDetailsForm = useCheckoutDetailsForm({
    cart: cartQuery.cart,
    customer: authQuery.customer,
    isCartLoading: cartQuery.isLoading,
    isCustomerLoading: authQuery.isLoading,
    onSubmit: async (values) => {
      if (!cartQuery.cart?.id) {
        setCheckoutError("Košík nie je pripravený.")
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
        setCheckoutError(
          "Zvolena krajina nie je dostupna pre aktualny kosik. Zvolte krajinu z ponuky."
        )
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
        setCheckoutError(resolveErrorMessage(error, "Uloženie adresy zlyhalo."))
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
      setCheckoutError("Košík nie je pripravený.")
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
        resolveErrorMessage(error, "Uloženie registrácie zlyhalo.")
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
    regionCurrencyCode
  )

  const cartItems = cartQuery.cart?.items ?? []
  const hasItems = cartQuery.itemCount > 0 || cartItems.length > 0
  const hasStoredAddress = resolveHasStoredAddress(cartQuery.cart)
  const hasShipping = Boolean(checkoutShippingQuery.selectedShippingMethodId)
  const hasPayment = Boolean(effectiveSelectedPaymentProviderId)

  const selectedShippingOptionPrice =
    checkoutShippingQuery.selectedShippingMethodId
      ? (checkoutShippingQuery.shippingPrices[
          checkoutShippingQuery.selectedShippingMethodId
        ] ?? 0)
      : 0
  const cartItemsTotalAmount = resolveCartItemsTotalAmount(cartQuery.cart)
  const cartShippingTotalAmount = cartQuery.cart?.shipping_methods?.length
    ? resolveCartShippingTotalAmount(cartQuery.cart)
    : selectedShippingOptionPrice
  const cartShippingSubtotalAmount = cartQuery.cart?.shipping_methods?.length
    ? resolveCartShippingSubtotalAmount(cartQuery.cart)
    : selectedShippingOptionPrice
  const cartTaxAmount = resolveCartTaxAmount(cartQuery.cart)
  const cartTotalAmount = resolveCartTotalAmount(cartQuery.cart)
  const cartTotalWithoutTaxAmount = resolveCartTotalWithoutTaxAmount(
    cartQuery.cart
  )
  const cartItemsSubtotalAmount = resolveCartItemsSubtotalAmount(cartQuery.cart)

  const isBusy =
    cartQuery.isFetching ||
    regionsQuery.isLoading ||
    regionsQuery.isFetching ||
    updateCartAddressMutation.isPending ||
    updateCartMutation.isPending ||
    checkoutShippingQuery.isSettingShipping ||
    checkoutPaymentQuery.isInitiatingPayment ||
    completeCheckoutMutation.isPending

  return {
    ...actions,
    billingAddressForm: checkoutDetailsForm.effectiveValues.billing,
    cartItems,
    cartQuery,
    cartItemsTotalAmount,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount,
    cartTotalWithoutTaxAmount,
    cartTotalAmount,
    cartItemsSubtotalAmount,
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
    selectedPaymentProviderId: effectiveSelectedPaymentProviderId,
    setHeurekaConsent,
    setMarketingConsent,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
    canCompleteOrder:
      !isBusy &&
      Boolean(checkoutShippingQuery.selectedShippingMethodId) &&
      Boolean(effectiveSelectedPaymentProviderId),
  }
}

export type CheckoutController = ReturnType<typeof useCheckoutController>
