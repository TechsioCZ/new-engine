"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

import { useAuth } from "@/lib/storefront/auth"
import {
  useCart,
  useUpdateCart,
  useUpdateCartAddress,
} from "@/lib/storefront/cart"
import {
  fetchPaymentProviders,
  resolveSelectedPaymentProviderId,
} from "@/lib/storefront/checkout"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"
import { useRegions } from "@/lib/storefront/regions"
import { storefront } from "@/lib/storefront/storefront"

import { useStoredPaymentProviderSelection } from "./checkout-payment-selection-storage"
import { resolveCheckoutCountryItemsForRegion } from "./checkout.constants"

interface CheckoutRuntimeOptions {
  allowCartAutoCreate: boolean
  completedOrderId: string | null
}

const resolveCartOptions = (
  { allowCartAutoCreate, completedOrderId }: CheckoutRuntimeOptions,
  region: ReturnType<typeof useRegionContext>,
) => ({
  autoCreate:
    allowCartAutoCreate &&
    (completedOrderId === null || completedOrderId.length === 0),
  ...(region?.region_id === undefined ? {} : { region_id: region.region_id }),
  ...(region?.country_code === undefined
    ? {}
    : { country_code: region.country_code }),
  enabled: region?.region_id !== undefined && region.region_id.length > 0,
})

export const useCheckoutRuntime = ({
  allowCartAutoCreate,
  completedOrderId,
}: CheckoutRuntimeOptions) => {
  const queryClient = useQueryClient()
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const region = useRegionContext()
  const regionCurrencyCode = resolveRegionCurrency(region)
  const authQuery = useAuth()
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const cartQuery = useCart(
    resolveCartOptions({ allowCartAutoCreate, completedOrderId }, region),
  )
  const activeRegionId = cartQuery.cart?.region_id ?? region?.region_id
  const regionsQuery = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })
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
          resolveErrorMessage(error, tCheckout("shipping_update_failed")),
        )
      },
    },
  )
  const checkoutPaymentQuery = storefront.flows.checkout.useCheckoutPayment(
    cartQuery.cart?.id,
    activeRegionId,
    cartQuery.cart,
    { enabled: Boolean(activeRegionId) },
  )
  const cartSelectedPaymentProviderId = resolveSelectedPaymentProviderId(
    cartQuery.cart,
  )
  const storedPaymentProviderId = useStoredPaymentProviderSelection(
    cartQuery.cart?.id,
  )
  const effectiveSelectedPaymentProviderId =
    storedPaymentProviderId ?? cartSelectedPaymentProviderId

  useEffect(() => {
    const cartId = cartQuery.cart?.id
    const regionCountryCode = region?.country_code?.toLowerCase()
    const cartCountryCode =
      cartQuery.cart?.shipping_address?.country_code?.toLowerCase() ?? null
    const isCartOrRegionMissing =
      cartId === undefined ||
      cartId.length === 0 ||
      regionCountryCode === undefined ||
      regionCountryCode.length === 0
    const alreadyHasCountryOrUpdating =
      (cartCountryCode !== null && cartCountryCode.length > 0) ||
      isUpdatingCartAddress ||
      isUpdatingCart

    if (isCartOrRegionMissing || alreadyHasCountryOrUpdating) {
      return
    }

    mutateCart({ cartId, country_code: regionCountryCode })
  }, [
    cartQuery.cart?.id,
    cartQuery.cart?.shipping_address?.country_code,
    region?.country_code,
    isUpdatingCart,
    isUpdatingCartAddress,
    mutateCart,
  ])

  useEffect(() => {
    if (
      activeRegionId === undefined ||
      activeRegionId === null ||
      activeRegionId.length === 0
    ) {
      return
    }
    runDetachedPromise(
      fetchPaymentProviders(queryClient, activeRegionId),
      () => {
        // Best-effort prefetch only.
      },
    )
  }, [activeRegionId, queryClient])

  const countryItems = resolveCheckoutCountryItemsForRegion({
    ...(region?.country_code === undefined
      ? {}
      : { activeCountryCode: region.country_code }),
    locale: marketContext.locale,
    ...(activeRegionId === undefined ? {} : { regionId: activeRegionId }),
    regions: regionsQuery.regions,
  })

  return {
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
  }
}
