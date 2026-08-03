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
export function useMetaAdapter(
  config?: UseMetaAdapterConfig
): AnalyticsAdapter {
  const debug = config?.debug
  const adapterKey = "meta" as const

  const trackCustom = createTracker(
    getFbq,
    (fbq, args: { eventName: string; params?: Record<string, unknown> }) => {
      fbq("trackCustom", args.eventName, args.params)
    },
    debug,
    adapterKey
  )

  return {
    key: adapterKey,

    trackViewContent: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "ViewContent", {
          content_ids: [params.productId],
          content_type: "product",
          content_name: params.productName,
          currency: params.currency,
          value: params.value,
          content_category: params.category,
        })
      },
      debug,
      adapterKey
    ),

    trackAddToCart: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "AddToCart", {
          content_ids: [params.productId],
          content_type: "product",
          content_name: params.productName,
          currency: params.currency,
          value: params.value,
          contents: [
            {
              id: params.productId,
              quantity: params.quantity,
            },
          ],
        })
      },
      debug,
      adapterKey
    ),

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
          currency: params.currency,
          value: params.value,
          num_items: params.numItems,
          ...(contents ? { contents } : {}),
        })
      },
      debug,
      adapterKey
    ),

    trackPurchase: createTracker(
      getFbq,
      (fbq, params) => {
        fbq("track", "Purchase", {
          content_ids: params.products.map((p) => p.id),
          content_type: "product",
          currency: params.currency,
          value: params.value,
          num_items: params.numItems,
          contents: params.products.map((p) => ({
            id: p.id,
            quantity: p.quantity ?? 1,
          })),
        })
      },
      debug,
      adapterKey
    ),

    trackCustom: (eventName, params) =>
      trackCustom(params === undefined ? { eventName } : { eventName, params }),
  }
}
