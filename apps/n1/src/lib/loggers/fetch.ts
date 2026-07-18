/**
 * Fetch Logger Utility
 * Logs timing for data fetching operations
 */

export const fetchLogger = {
  /**
   * Log current page fetch completion
   */
  current: (label: string, duration: number) => {
    if (process.env["NODE_ENV"] !== "development") {
      return
    }

    console.log(`✅ [Current] ${label} ready in ${Math.round(duration)}ms`)
  },

  /**
   * Log fetch cancellation (AbortSignal)
   */
  cancelled: (label: string, offset?: number) => {
    if (process.env["NODE_ENV"] !== "development") {
      return
    }

    const offsetStr = offset !== undefined ? ` @offset:${offset}` : ""
    console.log(`🚫 [Cancelled] ${label}${offsetStr}`)
  },
}
