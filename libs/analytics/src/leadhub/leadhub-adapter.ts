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
export const useLeadhubAdapter = (
  config?: UseLeadhubAdapterConfig,
): AnalyticsAdapter & LeadhubExtras => {
  const debug = config?.debug
  const adapterKey = "leadhub"

  return {
    key: adapterKey,

    // Leadhub uses SetCart instead of AddToCart.
    trackAddToCart: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("SetCart", {
          products: [
            {
              currency: params.currency,
              product_id: params.productId,
              quantity: params.quantity,
              value: params.value,
            },
          ],
        })
      },
      debug,
      adapterKey,
    ),

    trackIdentify: createTracker<LeadhubFunction, LeadhubIdentifyParams>(
      getLhi,
      (lhi, params) => {
        lhi("Identify", params)
      },
      debug,
      adapterKey,
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
            quantity:
              item.quantity === 0 || Number.isNaN(item.quantity)
                ? 1
                : item.quantity,
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
      adapterKey,
    ),

    trackPageview: createSimpleTracker<LeadhubFunction>(
      getLhi,
      (lhi) => {
        lhi("pageview")
      },
      debug,
      adapterKey,
    ),

    trackPurchase: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("Purchase", {
          ...(params.email === undefined ? {} : { email: params.email }),
          currency: params.currency,
          order_id: params.orderId,
          products: params.products.map((product) => ({
            currency: product.currency,
            product_id: product.id,
            quantity: product.quantity ?? 1,
            value: product.price,
          })),
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackSetCart: createTracker<LeadhubFunction, LeadhubSetCartParams>(
      getLhi,
      (lhi, params) => {
        lhi("SetCart", params)
      },
      debug,
      adapterKey,
    ),

    trackViewCategory: createTracker<
      LeadhubFunction,
      LeadhubViewCategoryParams
    >(
      getLhi,
      (lhi, params) => {
        lhi("ViewCategory", params)
      },
      debug,
      adapterKey,
    ),

    trackViewContent: createTracker(
      getLhi,
      (lhi, params) => {
        lhi("ViewContent", {
          products: [{ product_id: params.productId }],
        })
      },
      debug,
      adapterKey,
    ),
  }
}
