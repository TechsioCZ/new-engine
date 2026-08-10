/**
 * Unified e-commerce analytics tracking for the Techsio analytics package
 *
 * Recommended usage - unified hook:
 * ```tsx
 * import { useAnalytics } from '@techsio/analytics'
 * import { useMetaAdapter } from '@techsio/analytics/meta'
 * import { useGoogleAdapter } from '@techsio/analytics/google'
 *
 * const analytics = useAnalytics({
 *   adapters: [useMetaAdapter(), useGoogleAdapter()]
 * })
 *
 * analytics.trackPurchase({ ... })
 * ```
 *
 * Or import from specific module paths:
 * - @techsio/analytics/core - Core types and unified hook
 * - @techsio/analytics/meta - Meta Pixel
 * - @techsio/analytics/google - Google Ads / gtag
 * - @techsio/analytics/leadhub - Leadhub CDP
 * - @techsio/analytics/heureka - Heureka conversion tracking
 */

// Re-export core for convenience
export {
  useAnalytics,
  createWindowGetter,
  createTracker,
  createSimpleTracker,
} from "./core"

export type {
  Analytics,
  UseAnalyticsConfig,
  TrackingResult,
  AnalyticsAdapter,
  CoreViewContentParams,
  CoreAddToCartParams,
  CoreInitiateCheckoutParams,
  CorePurchaseParams,
  EcommerceProduct,
} from "./core"

// Component re-exports for convenience
export { MetaPixel } from "./meta"
