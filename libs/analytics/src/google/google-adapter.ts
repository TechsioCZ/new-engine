"use client"

import { createTracker } from "../core/create-tracker"
import { createWindowGetter } from "../core/get-global-function"
import type { AnalyticsAdapter } from "../core/types"
import type { GtagFunction } from "./types"

const getGtag = createWindowGetter<GtagFunction>("gtag")

export interface UseGoogleAdapterConfig {
  /** Google Ads conversion label for purchase events */
  conversionLabel?: string
  debug?: boolean
}

/**
 * Creates a Google Ads adapter for the unified analytics hook
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@techsio/analytics'
 * import { useGoogleAdapter } from '@techsio/analytics/google'
 *
 * const analytics = useAnalytics({
 *   adapters: [useGoogleAdapter({ conversionLabel: 'AW-XXXXX/YYYYY' })]
 * })
 * ```
 */
export const useGoogleAdapter = (
  config?: UseGoogleAdapterConfig,
): AnalyticsAdapter => {
  const { conversionLabel, debug } = config ?? {}
  const adapterKey = "google"

  const trackCustom = createTracker(
    getGtag,
    (gtag, args: { eventName: string; params?: object }) => {
      gtag("event", args.eventName, args.params)
    },
    debug,
    adapterKey,
  )

  return {
    key: adapterKey,

    trackAddToCart: createTracker(
      getGtag,
      (gtag, params) => {
        // Guard against division by zero and non-numeric values.
        const requestedQuantity = params.quantity
        const quantity =
          requestedQuantity === 0 || Number.isNaN(requestedQuantity)
            ? 1
            : requestedQuantity
        gtag("event", "add_to_cart", {
          currency: params.currency,
          items: [
            {
              item_category: params.category,
              item_id: params.productId,
              item_name: params.productName,
              // params.value is total value (unit price × quantity), divide to get unit price
              price: params.value / quantity,
              quantity,
            },
          ],
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackCustom: (eventName, params) =>
      trackCustom(params === undefined ? { eventName } : { eventName, params }),

    trackInitiateCheckout: createTracker(
      getGtag,
      (gtag, params) => {
        const items =
          params.items?.map((item) => ({
            item_id: item.productId,
            quantity: item.quantity ?? 1,
          })) ??
          params.productIds.map((id) => ({
            item_id: id,
            quantity: 1,
          }))

        gtag("event", "begin_checkout", {
          currency: params.currency,
          items,
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackPurchase: createTracker(
      getGtag,
      (gtag, params) => {
        gtag("event", "purchase", {
          currency: params.currency,
          items: params.products.map((p) => ({
            item_category: p.category,
            item_id: p.id,
            item_name: p.name,
            price: p.price,
            quantity: p.quantity ?? 1,
          })),
          transaction_id: params.orderId,
          value: params.value,
        })

        // If conversion label provided, also track as conversion
        if (conversionLabel !== undefined && conversionLabel.length > 0) {
          gtag("event", "conversion", {
            currency: params.currency,
            send_to: conversionLabel,
            transaction_id: params.orderId,
            value: params.value,
          })
        }
      },
      debug,
      adapterKey,
    ),

    trackViewContent: createTracker(
      getGtag,
      (gtag, params) => {
        gtag("event", "view_item", {
          currency: params.currency,
          items: [
            {
              item_category: params.category,
              item_id: params.productId,
              item_name: params.productName,
              price: params.value,
              quantity: 1,
            },
          ],
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),
  }
}
