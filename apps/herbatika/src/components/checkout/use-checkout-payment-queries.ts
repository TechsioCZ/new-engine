"use client"

import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import {
  fetchPaymentProviders,
  resolveSelectedPaymentProviderId,
} from "@/lib/storefront/checkout"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { storefront } from "@/lib/storefront/storefront"

import { useStoredPaymentProviderSelection } from "./checkout-payment-selection-storage"

export function useCheckoutPaymentQueries({
  activeRegionId,
  cart,
  queryClient,
}: {
  activeRegionId?: string
  cart: HttpTypes.StoreCart | null | undefined
  queryClient: QueryClient
}) {
  const checkoutPaymentQuery = storefront.flows.checkout.useCheckoutPayment(
    cart?.id,
    activeRegionId,
    cart,
    { enabled: Boolean(activeRegionId) }
  )
  const cartSelectedPaymentProviderId = resolveSelectedPaymentProviderId(cart)
  const storedPaymentProviderId = useStoredPaymentProviderSelection(cart?.id)
  const selectedPaymentProviderId =
    storedPaymentProviderId ?? cartSelectedPaymentProviderId

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

  return { checkoutPaymentQuery, selectedPaymentProviderId }
}
