"use client"

import { useAnalytics as useUnifiedAnalytics } from "@techsio/analytics"
import type { Analytics, AnalyticsAdapter } from "@techsio/analytics"
import { useGoogleAdapter as createGoogleAdapter } from "@techsio/analytics/google"
import { useLeadhubAdapter as createLeadhubAdapter } from "@techsio/analytics/leadhub"
import type {
  LeadhubIdentifyParams,
  LeadhubSetCartParams,
  LeadhubViewCategoryParams,
} from "@techsio/analytics/leadhub"
import { useMetaAdapter as createMetaAdapter } from "@techsio/analytics/meta"
import { createContext, useContext, useState } from "react"
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
  leadhubAdapter: ReturnType<typeof createLeadhubAdapter>,
): AnalyticsContextValue => ({
  ...analytics,
  trackIdentify: leadhubAdapter.trackIdentify,
  trackPageview: leadhubAdapter.trackPageview,
  trackSetCart: leadhubAdapter.trackSetCart,
  trackViewCategory: leadhubAdapter.trackViewCategory,
})

const createAnalyticsContextState = (
  analytics: Analytics,
  leadhubAdapter: ReturnType<typeof createLeadhubAdapter>,
): AnalyticsContextState => ({
  analytics,
  leadhubAdapter,
  value: createAnalyticsContextValue(analytics, leadhubAdapter),
})

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null)

const DEFAULT_DEBUG = process.env.NODE_ENV === "development"

interface AnalyticsAdapters {
  adapters: AnalyticsAdapter[]
  leadhubAdapter: ReturnType<typeof createLeadhubAdapter>
}

interface AnalyticsProviderState extends AnalyticsAdapters {
  debug: boolean
  googleConversionLabel: string | undefined
}

const createAnalyticsAdapters = (
  debug: boolean,
  googleConversionLabel?: string,
): AnalyticsProviderState => {
  const leadhubAdapter = createLeadhubAdapter({ debug })
  const adapters = [
    createMetaAdapter({ debug }),
    createGoogleAdapter({
      debug,
      ...(googleConversionLabel !== null &&
      googleConversionLabel !== undefined &&
      googleConversionLabel !== ""
        ? { conversionLabel: googleConversionLabel }
        : {}),
    }),
    leadhubAdapter,
  ]

  return { adapters, debug, googleConversionLabel, leadhubAdapter }
}

interface AnalyticsContextState {
  analytics: Analytics
  leadhubAdapter: ReturnType<typeof createLeadhubAdapter>
  value: AnalyticsContextValue
}

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
  debug = DEFAULT_DEBUG,
  googleConversionLabel,
}: AnalyticsProviderProps) => {
  const [adapterState, setAdapterState] = useState(() =>
    createAnalyticsAdapters(debug, googleConversionLabel),
  )
  const nextAdapterState =
    adapterState.debug === debug &&
    adapterState.googleConversionLabel === googleConversionLabel
      ? adapterState
      : createAnalyticsAdapters(debug, googleConversionLabel)

  if (nextAdapterState !== adapterState) {
    setAdapterState(nextAdapterState)
  }

  const analytics = useUnifiedAnalytics({
    adapters: nextAdapterState.adapters,
    debug,
  })
  const [contextState, setContextState] = useState<AnalyticsContextState>(() =>
    createAnalyticsContextState(analytics, nextAdapterState.leadhubAdapter),
  )
  const nextContextState =
    contextState.analytics === analytics &&
    contextState.leadhubAdapter === nextAdapterState.leadhubAdapter
      ? contextState
      : createAnalyticsContextState(analytics, nextAdapterState.leadhubAdapter)

  if (nextContextState !== contextState) {
    setContextState(nextContextState)
  }
  const { value } = nextContextState

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
