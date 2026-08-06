"use client"

import { createTracker } from "../core/create-tracker"
import { createWindowGetter } from "../core/get-global-function"
import type { AnalyticsAdapter } from "../core/types"
import type { MetaPixelFbq } from "./types"

const getFbq = createWindowGetter<MetaPixelFbq>("fbq")

export interface UseMetaAdapterConfig {
  debug?: boolean
}

/**
 * Creates a Meta Pixel adapter for the unified analytics hook
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@techsio/analytics'
 * import { useMetaAdapter } from '@techsio/analytics/meta'
 *
 * const analytics = useAnalytics({
 *   adapters: [useMetaAdapter()]
 * })
 * ```
 */
export const useMetaAdapter = (
  config?: UseMetaAdapterConfig,
): AnalyticsAdapter => {
  const debug = config?.debug
  const adapterKey = "meta"

  const trackCustom = createTracker(
    getFbq,
    (fbq, args: { eventName: string; params?: Record<string, unknown> }) => {
      fbq("trackCustom", args.eventName, args.params)
    },
    debug,
    adapterKey,
  )

  return {
    key: adapterKey,

    trackAddToCart: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "AddToCart", {
          content_ids: [params.productId],
          content_name: params.productName,
          content_type: "product",
          contents: [
            {
              id: params.productId,
              quantity: params.quantity,
            },
          ],
          currency: params.currency,
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackCustom: (eventName, params) =>
      trackCustom(params === undefined ? { eventName } : { eventName, params }),

    trackInitiateCheckout: createTracker(
      getFbq,
      (fbq, params) => {
        const contentIds =
          params.items?.map((item) => item.productId) ?? params.productIds
        const contents = params.items?.map((item) => ({
          id: item.productId,
          quantity: item.quantity || 1,
        }))

        fbq("track", "InitiateCheckout", {
          content_ids: contentIds,
          ...(contents === undefined ? {} : { contents }),
          currency: params.currency,
          num_items: params.numItems,
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackPurchase: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "Purchase", {
          content_ids: params.products.map((p) => p.id),
          content_type: "product",
          contents: params.products.map((p) => ({
            id: p.id,
            quantity: p.quantity ?? 1,
          })),
          currency: params.currency,
          num_items: params.numItems,
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),

    trackViewContent: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "ViewContent", {
          content_category: params.category,
          content_ids: [params.productId],
          content_name: params.productName,
          content_type: "product",
          currency: params.currency,
          value: params.value,
        })
      },
      debug,
      adapterKey,
    ),
  }
}
