/**
 * Unified Prefetch Logging Utility
 * Provides consistent logging format across all prefetch systems
 */

type PrefetchType = "Root" | "Categories" | "Pages" | "Children" | "Product"

export const prefetchLogger = {
  /**
   * Log prefetch start
   */
  start: (
    type: PrefetchType,
    label: string,
    metadata?: Record<string, unknown>
  ) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    const metaStr = metadata
      ? ` ${Object.entries(metadata)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ")}`
      : ""

    console.log(`🚀 [Prefetch ${type}] ${label}${metaStr}`)
  },

  /**
   * Log prefetch completion
   */
  complete: (type: PrefetchType, label: string, duration: number) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    console.log(
      `✅ [Prefetch ${type}] ${label} ready in ${Math.round(duration)}ms`
    )
  },

  /**
   * Log prefetch failure
   */
  fail: (
    type: PrefetchType,
    label: string,
    duration: number,
    error: unknown
  ) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    const errorMessage = error instanceof Error ? `: ${error.message}` : ""

    console.warn(
      `[Prefetch ${type}] ${label} failed in ${Math.round(duration)}ms${errorMessage}`
    )
  },

  /**
   * Log prefetch skip
   */
  skip: (type: PrefetchType, label: string, reason?: string) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    const reasonStr = reason ? ` (${reason})` : ""
    console.log(`⏭️ [Prefetch ${type}] ${label} skipped${reasonStr}`)
  },

  /**
   * Log cache hit
   */
  cacheHit: (type: PrefetchType, label: string) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    console.log(`💾 [Cache hit ${type}] ${label}`)
  },

  /**
   * Log general info
   */
  info: (type: PrefetchType, message: string) => {
    if (process.env.NODE_ENV !== "development") {
      return
    }

    console.log(`ℹ️ [Prefetch ${type}] ${message}`)
  },
}
