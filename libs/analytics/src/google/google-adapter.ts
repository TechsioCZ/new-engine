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
export function useGoogleAdapter(
  config?: UseGoogleAdapterConfig
): AnalyticsAdapter {
  const { conversionLabel, debug } = config ?? {}
  const adapterKey = "google" as const

  const trackCustom = createTracker(
    getGtag,
    (gtag, args: { eventName: string; params?: Record<string, unknown> }) => {
      gtag("event", args.eventName, args.params)
    },
    debug,
    adapterKey
  )

  return {
    key: adapterKey,

    trackViewContent: createTracker(
      getGtag,
      (gtag, params) => {
        gtag("event", "view_item", {
          currency: params.currency,
          value: params.value,
          items: [
            {
              item_id: params.productId,
              item_name: params.productName,
              item_category: params.category,
              price: params.value,
              quantity: 1,
            },
          ],
        })
      },
      debug,
      adapterKey
    ),

    trackAddToCart: createTracker(
      getGtag,
      (gtag, params) => {
        const quantity = params.quantity || 1 // Guard against division by zero
        gtag("event", "add_to_cart", {
          currency: params.currency,
          value: params.value,
          items: [
            {
              item_id: params.productId,
              item_name: params.productName,
              item_category: params.category,
              // params.value is total value (unit price × quantity), divide to get unit price
              price: params.value / quantity,
              quantity,
            },
          ],
        })
      },
      debug,
      adapterKey
    ),

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
          value: params.value,
          items,
        })
      },
      debug,
      adapterKey
    ),

    trackPurchase: createTracker(
      getGtag,
      (gtag, params) => {
        gtag("event", "purchase", {
          transaction_id: params.orderId,
          value: params.value,
          currency: params.currency,
          items: params.products.map((p) => ({
            item_id: p.id,
            item_name: p.name,
            item_category: p.category,
            price: p.price,
            quantity: p.quantity ?? 1,
          })),
        })

        // If conversion label provided, also track as conversion
        if (conversionLabel) {
          gtag("event", "conversion", {
            send_to: conversionLabel,
            value: params.value,
            currency: params.currency,
            transaction_id: params.orderId,
          })
        }
      },
      debug,
      adapterKey
    ),

    trackCustom: (eventName, params) =>
      trackCustom(params === undefined ? { eventName } : { eventName, params }),
  }
}
