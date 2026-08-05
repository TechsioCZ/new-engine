// Types
export type * from "./types"

// Shared utilities
export { createWindowGetter } from "./get-global-function"
export { createTracker, createSimpleTracker } from "./create-tracker"

// Unified analytics hook
export { useAnalytics } from "./use-analytics"
export type {
  Analytics,
  TrackingResult,
  UseAnalyticsConfig,
} from "./use-analytics"
