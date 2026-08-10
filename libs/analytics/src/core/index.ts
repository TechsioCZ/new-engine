// Types
export type {
  AnalyticsAdapter,
  CoreAddToCartParams,
  CoreCheckoutItem,
  CoreInitiateCheckoutParams,
  CorePurchaseParams,
  CoreViewContentParams,
  EcommerceProduct,
} from "./types"

// Shared utilities
export { createWindowGetter } from "./get-global-function"
export { createSimpleTracker, createTracker } from "./create-tracker"

// Unified analytics hook
export { useAnalytics } from "./use-analytics"
export type {
  Analytics,
  TrackingResult,
  UseAnalyticsConfig,
} from "./use-analytics"
