"use client"

import type {
  AnalyticsAdapter,
  CoreAddToCartParams,
  CoreInitiateCheckoutParams,
  CorePurchaseParams,
  CoreViewContentParams,
} from "./types"

/**
 * Configuration for the unified analytics hook
 */
export interface UseAnalyticsConfig {
  /** Array of analytics adapters to use */
  adapters: AnalyticsAdapter[]
  /** Enable debug logging */
  debug?: boolean
}

/**
 * Result of tracking operation across all adapters
 */
export interface TrackingResult {
  /** Whether all adapters successfully tracked the event */
  success: boolean
  /** Results per adapter */
  results: Record<string, boolean>
}

export interface Analytics {
  trackViewContent: (params: CoreViewContentParams) => TrackingResult
  trackAddToCart: (params: CoreAddToCartParams) => TrackingResult
  trackInitiateCheckout: (params: CoreInitiateCheckoutParams) => TrackingResult
  trackPurchase: (params: CorePurchaseParams) => TrackingResult
  trackCustom: (
    eventName: string,
    params?: Record<string, unknown>,
  ) => TrackingResult
}

/**
 * Unified analytics hook for tracking events across multiple providers
 *
 * @example
 * ```tsx
 * import { useEffect, useRef } from 'react'
 * import { useAnalytics } from '@techsio/analytics'
 * import { useMetaAdapter } from '@techsio/analytics/meta'
 * import { useGoogleAdapter } from '@techsio/analytics/google'
 * import { useLeadhubAdapter } from '@techsio/analytics/leadhub'
 *
 * function CheckoutSuccess({ order }) {
 *   const analytics = useAnalytics({
 *     adapters: [
 *       useMetaAdapter(),
 *       useGoogleAdapter(),
 *       useLeadhubAdapter(),
 *     ],
 *     debug: process.env.NODE_ENV === 'development'
 *   })
 *
 *   const trackedOrderId = useRef<string | null>(null)
 *
 *   useEffect(() => {
 *     if (!order?.id) return
 *     if (trackedOrderId.current === order.id) return
 *     trackedOrderId.current = order.id
 *
 *     analytics.trackPurchase({
 *       orderId: order.id,
 *       value: order.total,
 *       currency: 'CZK',
 *       numItems: order.items.length,
 *       products: order.items,
 *     })
 *   }, [analytics, order])
 * }
 * ```
 */
const createAnalytics = (
  adapters: AnalyticsAdapter[],
  debug: boolean,
): Analytics => {
  const executeAcrossAdapters = (
    label: string,
    run: (adapter: AnalyticsAdapter) => boolean | undefined,
  ): TrackingResult => {
    const resultEntries = new Map<string, boolean>()
    const keyCounts = new Map<string, number>()
    let allSuccess = true

    for (const adapter of adapters) {
      const count = (keyCounts.get(adapter.key) ?? 0) + 1
      keyCounts.set(adapter.key, count)
      const resultKey = count === 1 ? adapter.key : `${adapter.key}#${count}`

      if (count > 1 && debug) {
        console.warn(
          `[Analytics] Duplicate adapter key detected: "${adapter.key}". Results will be keyed as "${resultKey}".`,
        )
      }

      try {
        const success = run(adapter)
        resultEntries.set(resultKey, success ?? true)

        if (success === false) {
          allSuccess = false
        }
      } catch (error) {
        resultEntries.set(resultKey, false)
        allSuccess = false
        if (debug) {
          console.error(`[Analytics:${resultKey}] Error in ${label}:`, error)
        }
      }
    }

    const results = Object.fromEntries(resultEntries)
    if (debug) {
      console.log(`[Analytics] ${label} results:`, results)
    }

    return { results, success: allSuccess }
  }

  return {
    trackAddToCart: (params) =>
      executeAcrossAdapters("trackAddToCart", (adapter) =>
        adapter.trackAddToCart?.(params),
      ),

    trackCustom: (eventName, params) =>
      executeAcrossAdapters(`trackCustom(${eventName})`, (adapter) =>
        adapter.trackCustom?.(eventName, params),
      ),

    trackInitiateCheckout: (params) =>
      executeAcrossAdapters("trackInitiateCheckout", (adapter) =>
        adapter.trackInitiateCheckout?.(params),
      ),

    trackPurchase: (params) =>
      executeAcrossAdapters("trackPurchase", (adapter) =>
        adapter.trackPurchase?.(params),
      ),

    trackViewContent: (params) =>
      executeAcrossAdapters("trackViewContent", (adapter) =>
        adapter.trackViewContent?.(params),
      ),
  }
}

const analyticsCache = new WeakMap<
  AnalyticsAdapter[],
  Map<boolean, Analytics>
>()

const getCachedAnalytics = (
  adapters: AnalyticsAdapter[],
  debug: boolean,
): Analytics => {
  const cachedByDebug = analyticsCache.get(adapters)
  if (cachedByDebug !== undefined) {
    const cached = cachedByDebug.get(debug)
    if (cached !== undefined) {
      return cached
    }

    const analytics = createAnalytics(adapters, debug)
    cachedByDebug.set(debug, analytics)
    return analytics
  }

  const analytics = createAnalytics(adapters, debug)
  analyticsCache.set(adapters, new Map([[debug, analytics]]))
  return analytics
}

export const useAnalytics = ({
  adapters,
  debug,
}: UseAnalyticsConfig): Analytics =>
  getCachedAnalytics(adapters, debug === true)
