"use client"

import { useAnalytics as useUnifiedAnalytics } from "@techsio/analytics"
import { useGoogleAdapter } from "@techsio/analytics/google"
import {
  type LeadhubIdentifyParams,
  type LeadhubSetCartParams,
  type LeadhubViewCategoryParams,
  useLeadhubAdapter,
} from "@techsio/analytics/leadhub"
import { useMetaAdapter } from "@techsio/analytics/meta"
import { createContext, type ReactNode, useContext, useMemo } from "react"

/**
 * Extended analytics interface with Leadhub-specific methods
 */
type AnalyticsContextValue = ReturnType<typeof useUnifiedAnalytics> & {
  /** Track category page view (Leadhub only) */
  trackViewCategory: (params: LeadhubViewCategoryParams) => boolean
  /** Track user identification on login/register (Leadhub only) */
  trackIdentify: (params: LeadhubIdentifyParams) => boolean
  /** Track cart state changes (Leadhub only) */
  trackSetCart: (params: LeadhubSetCartParams) => boolean
  /** Track page view (Leadhub only) */
  trackPageview: () => boolean
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

type AnalyticsProviderProps = {
  children: ReactNode
  /** Enable debug logging (defaults to true in development) */
  debug?: boolean
  /** Google Ads conversion label for purchase events */
  googleConversionLabel?: string
}

/**
 * Analytics Provider for unified tracking across Meta, Google, and Leadhub
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <AnalyticsProvider>
 *   {children}
 * </AnalyticsProvider>
 *
 * // In any client component
 * const analytics = useAnalytics()
 * analytics.trackViewContent({ productId, productName, value, currency })
 * ```
 */
export function AnalyticsProvider({
  children,
  debug = process.env.NODE_ENV === "development",
  googleConversionLabel,
}: AnalyticsProviderProps) {
  // Create Leadhub adapter - we need direct access to its specific methods
  const leadhubAdapter = useLeadhubAdapter({ debug })

  // Create unified analytics with all adapters
  const analytics = useUnifiedAnalytics({
    adapters: [
      useMetaAdapter({ debug }),
      useGoogleAdapter({ debug, conversionLabel: googleConversionLabel }),
      leadhubAdapter,
    ],
    debug,
  })

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<AnalyticsContextValue>(
    () => ({
      // Unified methods (sends to all adapters)
      ...analytics,
      // Leadhub-specific methods
      trackViewCategory: leadhubAdapter.trackViewCategory,
      trackIdentify: leadhubAdapter.trackIdentify,
      trackSetCart: leadhubAdapter.trackSetCart,
      trackPageview: leadhubAdapter.trackPageview,
    }),
    [analytics, leadhubAdapter]
  )

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to access analytics tracking methods
 *
 * @throws Error if used outside of AnalyticsProvider
 *
 * @example
 * ```tsx
 * function ProductPage({ product }) {
 *   const analytics = useAnalytics()
 *
 *   useEffect(() => {
 *     analytics.trackViewContent({
 *       productId: product.id,
 *       productName: product.title,
 *       value: product.price,
 *       currency: 'CZK',
 *     })
 *   }, [product.id])
 * }
 * ```
 */
export function useAnalytics(): AnalyticsContextValue {
  const context = useContext(AnalyticsContext)

  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider")
  }

  return context
}
