"use client"

import { createTracker } from "../core/create-tracker"
import { createWindowGetter } from "../core/get-global-function"
import type { AnalyticsAdapter } from "../core/types"
import type { HeurekaFunction } from "./types"

const getHeureka = createWindowGetter<HeurekaFunction>("heureka")

export interface UseHeurekaAdapterConfig {
  /** Heureka API key - required */
  apiKey: string
  debug?: boolean
}

/**
 * Creates a Heureka adapter for the unified analytics hook
 *
 * Note: Heureka only supports Purchase tracking (conversion tracking).
 * ViewContent, AddToCart, and InitiateCheckout are not supported.
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@techsio/analytics'
 * import { useHeurekaAdapter } from '@techsio/analytics/heureka'
 *
 * const analytics = useAnalytics({
 *   adapters: [useHeurekaAdapter({ apiKey: 'YOUR_HEUREKA_API_KEY' })]
 * })
 * ```
 */
export function useHeurekaAdapter(
  config: UseHeurekaAdapterConfig
): AnalyticsAdapter {
  const { apiKey, debug } = config
  const adapterKey = "heureka" as const

  return {
    key: adapterKey,

    // Heureka only supports purchase/conversion tracking
    trackPurchase: createTracker(
      getHeureka,
      (heureka, params) => {
        // Authenticate
        heureka("authenticate", apiKey)

        // Set order ID
        heureka("set_order_id", params.orderId)

        // Add all products
        for (const product of params.products) {
          heureka(
            "add_product",
            product.id,
            product.name,
            String(product.price),
            String(product.quantity ?? 1)
          )
        }

        // Set total and currency
        heureka("set_total_vat", String(params.value))
        heureka("set_currency", params.currency)

        // Send the order
        heureka("send", "Order")
      },
      debug,
      adapterKey
    ),
  }
}
