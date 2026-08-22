"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"
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
import {
  buildOrderConfirmationHref,
  issueOrderConfirmationAccess,
  syncCartSession,
} from "@/lib/storefront/checkout-access"
import {
  type CheckoutPurchaseAcceptanceSnapshot,
  createCheckoutPurchaseAcceptance,
} from "@/lib/storefront/checkout-purchase-acceptance"
import { resolveSupportedCurrencyCode } from "@/lib/storefront/currency"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { useRegions } from "@/lib/storefront/regions"
import { storefront } from "@/lib/storefront/storefront"
import { isRecord, readAccountSetupRequested } from "./account-setup-metadata"
import {
  isCheckoutCountryAvailableForRegion,
  resolveCheckoutCountryItemsForRegion,
} from "./checkout.constants"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { resolveHasStoredAddress } from "./checkout-address.utils"
import { resolveOrderId } from "./checkout-completion.utils"
import {
  reportCheckoutError,
  resolveCheckoutCustomerErrorMessage,
} from "./checkout-customer-error"
import {
  buildCheckoutMetadata,
  isCheckoutMetadataSynced,
  readOrderNote,
} from "./checkout-metadata"
import {
  filterPaymentProvidersForShipping,
  isPaymentProviderCompatibleWithShipping,
} from "./checkout-payment-compatibility"
import {
  clearStoredPaymentProviderSelection,
  useStoredPaymentProviderSelection,
  writeStoredPaymentProviderSelection,
} from "./checkout-payment-selection-storage"
import { useCheckoutActions } from "./use-checkout-actions"
import { useCheckoutConsent } from "./use-checkout-consent"
import { useCheckoutDetailsForm } from "./use-checkout-details-form"

const resolveCompleteResultOrderMetadata = (result: unknown) => {
  if (!(isRecord(result) && isRecord(result.order))) {
    return null
  }

  return result.order.metadata
}

type CheckoutCartReadInput = Readonly<{
  allowCartAutoCreate: boolean
  authorizedCartId?: string
  completedOrderId: string | null
  countryCode?: string
  regionId?: string
}>

export const resolveCheckoutCartReadInput = (
  input: CheckoutCartReadInput
): Parameters<typeof useCart>[0] => ({
  autoCreate:
    input.authorizedCartId === undefined &&
    input.allowCartAutoCreate &&
    !input.completedOrderId,
  cartId: input.authorizedCartId,
  country_code: input.countryCode,
  enabled: Boolean(input.regionId),
  region_id: input.regionId,
})

type UseCheckoutControllerOptions = Readonly<{
  authorizedCartId?: string
}>

export function useCheckoutController({
  authorizedCartId,
}: UseCheckoutControllerOptions = {}) {
  const queryClient = useQueryClient()
  const tCheckout = useTranslations("checkout")
  const tCart = useTranslations("cart")
  const customerErrorMessages = {
    cartUnavailable: tCheckout("cart_not_ready"),
    insufficientInventory: tCart("insufficient_quantity"),
    paymentAuthorizationFailed: tCheckout("payment_return_not_completed"),
  }
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const authQuery = useAuth()
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [purchaseAcceptanceState, setPurchaseAcceptanceState] = useState({
    granted: false,
    scope: "",
  })
  const checkoutConsent = useCheckoutConsent(marketContext.code)
  const saveAddressSucceededRef = useRef(false)

  const cartQuery = useCart(
    resolveCheckoutCartReadInput({
      allowCartAutoCreate,
      authorizedCartId,
      completedOrderId,
      countryCode: region?.country_code,
      regionId: region?.region_id,
    })
  )
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
  const purchaseAcceptanceScope = `${marketContext.code}:${cartQuery.cart?.id ?? ""}`
  const purchaseAcceptanceGranted =
    purchaseAcceptanceState.granted &&
    purchaseAcceptanceState.scope === purchaseAcceptanceScope
  const setPurchaseAcceptanceGranted = (granted: boolean) => {
    setPurchaseAcceptanceState({ granted, scope: purchaseAcceptanceScope })
  }

  const checkoutShippingQuery = storefront.flows.checkout.useCheckoutShipping(
    cartQuery.cart?.id,
    cartQuery.cart,
    {
      enabled: Boolean(cartQuery.cart?.id),
      onError: (error) => {
        reportCheckoutError("shipping options", error)
        setCheckoutError(
          resolveCheckoutCustomerErrorMessage(
            error,
            tCheckout("shipping_update_failed"),
            customerErrorMessages,
            "shipping"
          )
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
  const [paymentSelectionHydratedCartId, setPaymentSelectionHydratedCartId] =
    useState<string | null>(null)

  useEffect(() => {
    if (cartQuery.cart?.id) {
      setPaymentSelectionHydratedCartId(cartQuery.cart.id)
    }
  }, [cartQuery.cart?.id])

  const isPaymentSelectionHydrated =
    !cartQuery.cart?.id || paymentSelectionHydratedCartId === cartQuery.cart.id
  const selectedPaymentProviderId =
    storedPaymentProviderId ?? cartSelectedPaymentProviderId
  const compatiblePaymentProviders = filterPaymentProvidersForShipping({
    paymentProviders: checkoutPaymentQuery.paymentProviders,
    shippingOption: checkoutShippingQuery.selectedOption,
  })
  const effectiveSelectedPaymentProviderId =
    isPaymentProviderCompatibleWithShipping({
      paymentProviderId: selectedPaymentProviderId,
      shippingOption: checkoutShippingQuery.selectedOption,
    })
      ? selectedPaymentProviderId
      : undefined
  const compatibleCheckoutPaymentQuery = {
    ...checkoutPaymentQuery,
    paymentProviders: compatiblePaymentProviders,
  }

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

  useEffect(() => {
    const cartId = cartQuery.cart?.id
    if (!(cartId && cartQuery.itemCount > 0)) {
      return
    }

    runDetachedPromise(syncCartSession(cartId), () => {
      // Completion repeats this as a required, awaited authorization step.
    })
  }, [cartQuery.cart?.id, cartQuery.itemCount])

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
    cartId: cartQuery.cart?.id,
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    completedOrderId,
    completeCart: async () => {
      const cartId = cartQuery.cart?.id
      if (!cartId) {
        throw new Error("Checkout cart is not ready.")
      }

      await syncCartSession(cartId)

      logCheckoutAccountSetupDebug("complete cart invoked", {
        cart_id: cartId,
        cart_metadata_requested: readAccountSetupRequested(
          cartQuery.cart?.metadata
        ),
      })

      const completeResult = await completeCheckoutMutation.mutateAsync({
        cartId,
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
    onCompletedOrderIdChange: async (orderId) => {
      if (!orderId) {
        setCompletedOrderId(null)
        return
      }

      const cartId = cartQuery.cart?.id
      if (!cartId) {
        setCompletedOrderId(orderId)
        throw new Error("Checkout cart is not ready.")
      }

      clearStoredPaymentProviderSelection(cartId)

      try {
        if (authQuery.isAuthenticated) {
          window.location.assign(
            buildOrderConfirmationHref({
              market: marketContext.code,
              publicOrderId: orderId,
            })
          )
          return
        }

        const access = await issueOrderConfirmationAccess({
          cartId,
          publicOrderId: orderId,
        })
        window.location.assign(
          buildOrderConfirmationHref({
            market: marketContext.code,
            publicOrderId: access.publicOrderId,
          })
        )
      } catch (error) {
        setCompletedOrderId(orderId)
        throw error
      }
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
        const checkoutMetadata = buildCheckoutMetadata({
          accountSetupRequested:
            !authQuery.isAuthenticated && values.accountSetupRequested,
          cartId: cartQuery.cart.id,
          consent: checkoutConsent.consent,
          metadata: cartQuery.cart.metadata,
          orderNote: effectiveCheckoutDetails.shipping.customerNote,
          purchaseAcceptance: null,
        })

        logCheckoutAccountSetupDebug("address submit update cart request", {
          cart_id: cartQuery.cart.id,
          current_metadata_requested: readAccountSetupRequested(
            cartQuery.cart.metadata
          ),
          form_requested: values.accountSetupRequested,
          has_order_note: Boolean(readOrderNote(checkoutMetadata)),
          is_authenticated: authQuery.isAuthenticated,
          payload_metadata_requested:
            readAccountSetupRequested(checkoutMetadata),
        })

        const updatedCart = await updateCartAddressMutation.mutateAsync({
          cartId: cartQuery.cart.id,
          email: values.shipping.email.trim(),
          metadata: checkoutMetadata,
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
        reportCheckoutError("address update", error)
        setCheckoutError(
          resolveCheckoutCustomerErrorMessage(
            error,
            tCheckout("address_update_failed"),
            customerErrorMessages,
            "address"
          )
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

  const syncCheckoutMetadata = async (
    purchaseAcceptance: CheckoutPurchaseAcceptanceSnapshot
  ) => {
    const cart = cartQuery.cart

    if (!cart?.id) {
      setCheckoutError(tCheckout("cart_not_ready"))
      return false
    }

    const requested =
      !authQuery.isAuthenticated &&
      checkoutDetailsForm.values.accountSetupRequested
    const orderNote = checkoutDetailsForm.values.shipping.customerNote

    logCheckoutAccountSetupDebug("complete order metadata sync entered", {
      cart_id: cart.id,
      current_metadata_requested: readAccountSetupRequested(cart.metadata),
      form_requested: checkoutDetailsForm.values.accountSetupRequested,
      has_order_note: Boolean(readOrderNote(cart.metadata)),
      is_authenticated: authQuery.isAuthenticated,
      requested,
    })

    if (
      isCheckoutMetadataSynced({
        accountSetupRequested: requested,
        cartId: cart.id,
        consent: checkoutConsent.consent,
        metadata: cart.metadata,
        orderNote,
        purchaseAcceptance,
      })
    ) {
      logCheckoutAccountSetupDebug("complete order metadata already synced", {
        cart_id: cart.id,
        requested,
      })
      return true
    }

    try {
      const updatedCart = await updateCartMutation.mutateAsync({
        cartId: cart.id,
        metadata: buildCheckoutMetadata({
          accountSetupRequested: requested,
          cartId: cart.id,
          consent: checkoutConsent.consent,
          metadata: cart.metadata,
          orderNote,
          purchaseAcceptance,
        }),
      })

      logCheckoutAccountSetupDebug("complete order metadata sync response", {
        cart_id: updatedCart.id,
        response_metadata_requested: readAccountSetupRequested(
          updatedCart.metadata
        ),
        response_has_order_note: Boolean(readOrderNote(updatedCart.metadata)),
      })

      if (
        updatedCart.id !== cart.id ||
        !isCheckoutMetadataSynced({
          accountSetupRequested: requested,
          cartId: cart.id,
          consent: checkoutConsent.consent,
          metadata: updatedCart.metadata,
          orderNote,
          purchaseAcceptance,
        })
      ) {
        setCheckoutError(tCheckout("review_legal_required"))
        return false
      }

      return true
    } catch (error) {
      reportCheckoutError("metadata update", error)
      setCheckoutError(
        resolveCheckoutCustomerErrorMessage(
          error,
          tCheckout("address_update_failed"),
          customerErrorMessages,
          "address"
        )
      )
      return false
    }
  }

  const handleCompleteOrder = async () => {
    const cartId = cartQuery.cart?.id
    if (!(cartId && purchaseAcceptanceGranted)) {
      setCheckoutError(tCheckout("review_legal_required"))
      return
    }

    const purchaseAcceptance = createCheckoutPurchaseAcceptance({
      cartId,
      market: marketContext.code,
    })
    const didSyncCheckoutMetadata =
      await syncCheckoutMetadata(purchaseAcceptance)

    logCheckoutAccountSetupDebug("handle complete order sync verdict", {
      did_sync_checkout_metadata: didSyncCheckoutMetadata,
    })

    if (!didSyncCheckoutMetadata) {
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
  const hasStoredAddress = resolveHasStoredAddress(
    cartQuery.cart,
    region?.country_code ?? marketContext.countryCode
  )
  const hasShipping = Boolean(checkoutShippingQuery.selectedShippingMethodId)
  const hasPayment = Boolean(effectiveSelectedPaymentProviderId)

  const selectedShippingOptionPrice =
    checkoutShippingQuery.selectedShippingMethodId
      ? (checkoutShippingQuery.shippingPrices[
          checkoutShippingQuery.selectedShippingMethodId
        ] ?? 0)
      : 0
  const hasCartShippingMethods = Boolean(
    cartQuery.cart?.shipping_methods?.length
  )
  const cartItemsTotalAmount = resolveCartItemsTotalAmount(cartQuery.cart)
  const cartShippingTotalAmount = hasCartShippingMethods
    ? resolveCartShippingTotalAmount(cartQuery.cart)
    : selectedShippingOptionPrice
  const cartShippingSubtotalAmount = hasCartShippingMethods
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
    completeCheckoutMutation.isPending ||
    checkoutConsent.isPending

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
    checkoutPaymentQuery: compatibleCheckoutPaymentQuery,
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
    heurekaConsent: checkoutConsent.heurekaConsent,
    isAuthenticated: authQuery.isAuthenticated,
    isBusy,
    isCompanyPurchase: checkoutDetailsForm.values.isCompanyPurchase,
    isPaymentSelectionHydrated,
    marketingConsent: checkoutConsent.marketingConsent,
    purchaseAcceptanceGranted,
    selectedPaymentProviderId: effectiveSelectedPaymentProviderId,
    setHeurekaConsent: checkoutConsent.setHeurekaConsent,
    setMarketingConsent: checkoutConsent.setMarketingConsent,
    setPurchaseAcceptanceGranted,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
    canCompleteOrder:
      !isBusy &&
      purchaseAcceptanceGranted &&
      Boolean(checkoutShippingQuery.selectedShippingMethodId) &&
      Boolean(effectiveSelectedPaymentProviderId),
  }
}

export type CheckoutController = ReturnType<typeof useCheckoutController>
