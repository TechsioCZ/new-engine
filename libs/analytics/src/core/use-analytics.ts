"use client"

import { useRef } from "react"

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
    params?: Record<string, unknown>
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
export function useAnalytics({
  adapters,
  debug,
}: UseAnalyticsConfig): Analytics {
  // Stable ref for adapters to prevent callback recreation on every render
  // when consumers pass a new array reference (e.g., inline array literals)
  const adaptersRef = useRef(adapters)
  adaptersRef.current = adapters

  // Stable ref for debug flag, so we can keep stable methods without
  // useCallback/useMemo churn.
  const debugRef = useRef(debug)
  debugRef.current = debug

  const analyticsRef = useRef<Analytics | null>(null)

  if (!analyticsRef.current) {
    const executeAcrossAdapters = (
      label: string,
      run: (adapter: AnalyticsAdapter) => boolean | undefined
    ): TrackingResult => {
      const results: Record<string, boolean> = Object.create(null)
      const keyCounts: Record<string, number> = Object.create(null)
      let allSuccess = true

      for (const adapter of adaptersRef.current) {
        const count = (keyCounts[adapter.key] ?? 0) + 1
        keyCounts[adapter.key] = count
        const resultKey = count === 1 ? adapter.key : `${adapter.key}#${count}`

        if (count > 1 && debugRef.current) {
          console.warn(
            `[Analytics] Duplicate adapter key detected: "${adapter.key}". Results will be keyed as "${resultKey}".`
          )
        }

        try {
          const success = run(adapter)
          results[resultKey] = success ?? true

          if (success === false) {
            allSuccess = false
          }
        } catch (error) {
          results[resultKey] = false
          allSuccess = false
          if (debugRef.current) {
            console.error(`[Analytics:${resultKey}] Error in ${label}:`, error)
          }
        }
      }

      if (debugRef.current) {
        console.log(`[Analytics] ${label} results:`, results)
      }

      return { success: allSuccess, results }
    }

    analyticsRef.current = {
      trackViewContent: (params) =>
        executeAcrossAdapters("trackViewContent", (adapter) =>
          adapter.trackViewContent?.(params)
        ),

      trackAddToCart: (params) =>
        executeAcrossAdapters("trackAddToCart", (adapter) =>
          adapter.trackAddToCart?.(params)
        ),

      trackInitiateCheckout: (params) =>
        executeAcrossAdapters("trackInitiateCheckout", (adapter) =>
          adapter.trackInitiateCheckout?.(params)
        ),

      trackPurchase: (params) =>
        executeAcrossAdapters("trackPurchase", (adapter) =>
          adapter.trackPurchase?.(params)
        ),

      trackCustom: (eventName, params) =>
        executeAcrossAdapters(`trackCustom(${eventName})`, (adapter) =>
          adapter.trackCustom?.(eventName, params)
        ),
    }
  }

  const analytics = analyticsRef.current
  if (!analytics) {
    throw new Error("Analytics not initialized")
  }

  return analytics
}
