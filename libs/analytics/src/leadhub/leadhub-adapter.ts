"use client"

import { createSimpleTracker, createTracker } from "../core/create-tracker"
import { createWindowGetter } from "../core/get-global-function"
import type { AnalyticsAdapter } from "../core/types"
import type {
  LeadhubExtras,
  LeadhubFunction,
  LeadhubIdentifyParams,
  LeadhubSetCartParams,
  LeadhubViewCategoryParams,
} from "./types"

const getLhi = createWindowGetter<LeadhubFunction>(["lhi", "LHInsights"])

export interface UseLeadhubAdapterConfig {
  /** Enable debug logging (never enable in production). */
  debug?: boolean
}

/**
 * Creates a Leadhub adapter for the unified analytics hook.
 * Returns AnalyticsAdapter with additional Leadhub-specific methods.
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@techsio/analytics'
 * import { useLeadhubAdapter } from '@techsio/analytics/leadhub'
 *
 * const leadhubAdapter = useLeadhubAdapter()
 *
 * // Use with unified analytics
 * const analytics = useAnalytics({
 *   adapters: [leadhubAdapter]
 * })
 *
 * // Access Leadhub-specific methods directly
 * leadhubAdapter.trackViewCategory({ category: 'Žena > Kabáty' })
 * leadhubAdapter.trackIdentify({ email: 'user@example.com', subscribe: [] })
 * ```
 */
export function useLeadhubAdapter(
  config?: UseLeadhubAdapterConfig
): AnalyticsAdapter & LeadhubExtras {
  const debug = config?.debug
  const adapterKey = "leadhub" as const

  return {
    key: adapterKey,

    trackViewContent: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("ViewContent", {
          products: [{ product_id: params.productId }],
        })
      },
      debug,
      adapterKey
    ),

    // Leadhub uses SetCart instead of AddToCart
    trackAddToCart: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("SetCart", {
          products: [
            {
              product_id: params.productId,
              quantity: params.quantity,
              value: params.value,
              currency: params.currency,
            },
          ],
        })
      },
      debug,
      adapterKey
    ),

    // Leadhub doesn't support InitiateCheckout event - using SetCart as workaround.
    // If per-product quantities are available (params.items), pass them through;
    // otherwise default to quantity: 1 to signal checkout intent.
    trackInitiateCheckout: createTracker(
      getLhi,
      (lhi, params) => {
        const products =
          params.items?.map((item) => ({
            product_id: item.productId,
            quantity: item.quantity || 1,
          })) ??
          params.productIds.map((id) => ({
            product_id: id,
            quantity: 1,
          }))

        lhi("SetCart", {
          products,
        })
      },
      debug,
      adapterKey
    ),

    trackPurchase: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("Purchase", {
          ...(params.email === undefined ? {} : { email: params.email }),
          value: params.value,
          currency: params.currency,
          order_id: params.orderId,
          products: params.products.map((p) => ({
            product_id: p.id,
            quantity: p.quantity ?? 1,
            value: p.price,
            currency: p.currency,
          })),
        })
      },
      debug,
      adapterKey
    ),

    // ========================================
    // Leadhub-specific methods (LeadhubExtras)
    // ========================================

    trackViewCategory: createTracker<
      LeadhubFunction,
      LeadhubViewCategoryParams
    >(
      getLhi,
      (lhi, params) => {
        lhi("ViewCategory", params)
      },
      debug,
      adapterKey
    ),

    trackIdentify: createTracker<LeadhubFunction, LeadhubIdentifyParams>(
      getLhi,
      (lhi, params) => {
        lhi("Identify", params)
      },
      debug,
      adapterKey
    ),

    trackSetCart: createTracker<LeadhubFunction, LeadhubSetCartParams>(
      getLhi,
      (lhi, params) => {
        lhi("SetCart", params)
      },
      debug,
      adapterKey
    ),

    trackPageview: createSimpleTracker<LeadhubFunction>(
      getLhi,
      (lhi) => {
        lhi("pageview")
      },
      debug,
      adapterKey
    ),
  }
}
