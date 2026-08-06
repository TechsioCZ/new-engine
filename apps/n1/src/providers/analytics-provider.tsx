"use client"

import { useAnalytics as useUnifiedAnalytics } from "@techsio/analytics"
import type { Analytics } from "@techsio/analytics"
import { useGoogleAdapter } from "@techsio/analytics/google"
import { useLeadhubAdapter } from "@techsio/analytics/leadhub"
import type {
  LeadhubIdentifyParams,
  LeadhubSetCartParams,
  LeadhubViewCategoryParams,
} from "@techsio/analytics/leadhub"
import { useMetaAdapter } from "@techsio/analytics/meta"
import { createContext, useContext } from "react"
import type { ReactNode } from "react"

/**
 * Extended analytics interface with Leadhub-specific methods
 */
interface AnalyticsContextValue extends Analytics {
  /** Track category page view (Leadhub only) */
  trackViewCategory: (params: LeadhubViewCategoryParams) => boolean
  /** Track user identification on login/register (Leadhub only) */
  trackIdentify: (params: LeadhubIdentifyParams) => boolean
  /** Track cart state changes (Leadhub only) */
  trackSetCart: (params: LeadhubSetCartParams) => boolean
  /** Track page view (Leadhub only) */
  trackPageview: () => boolean
}

const createAnalyticsContextValue = (
  analytics: Analytics,
  leadhubAdapter: ReturnType<typeof useLeadhubAdapter>,
): AnalyticsContextValue => ({
  ...analytics,
  trackIdentify: leadhubAdapter.trackIdentify,
  trackPageview: leadhubAdapter.trackPageview,
  trackSetCart: leadhubAdapter.trackSetCart,
  trackViewCategory: leadhubAdapter.trackViewCategory,
})

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

interface AnalyticsProviderProps {
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
export const AnalyticsProvider = ({
  children,
  debug = process.env.NODE_ENV === "development",
  googleConversionLabel,
}: AnalyticsProviderProps) => {
  // Create Leadhub adapter - we need direct access to its specific methods
  const leadhubAdapter = useLeadhubAdapter({ debug })

  // Create unified analytics with all adapters
  const analytics = useUnifiedAnalytics({
    adapters: [
      useMetaAdapter({ debug }),
      useGoogleAdapter({
        debug,
        ...(googleConversionLabel !== null &&
        googleConversionLabel !== undefined &&
        googleConversionLabel !== ""
          ? { conversionLabel: googleConversionLabel }
          : {}),
      }),
      leadhubAdapter,
    ],
    debug,
  })

  const value = createAnalyticsContextValue(analytics, leadhubAdapter)

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  )
}

/**
 * Hook to access analytics tracking methods
 *
 * @throws {Error} If used outside of AnalyticsProvider
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
export const useAnalytics = (): AnalyticsContextValue => {
  const context = useContext(AnalyticsContext)

  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider")
  }

  return context
}
