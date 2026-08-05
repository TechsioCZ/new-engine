/**
 * Factory for creating standardized tracking functions
 * Eliminates null-checking boilerplate across analytics hooks
 */

/**
 * Creates a tracking function with standardized null-checking and error handling
 *
 * @param getGlobalFn - Function that returns the global tracking function or null
 * @param trackFn - The actual tracking implementation
 * @param debug - Enable debug logging
 * @param adapterKey - Adapter identifier for debug messages
 * @returns A function that returns true if tracking succeeded, false otherwise
 *
 * @example
 * ```ts
 * const trackPurchase = createTracker(
 *   getGtag,
 *   (gtag, params) => {
 *     gtag('event', 'purchase', params)
 *   },
 *   debug,
 *   'google'
 * )
 *
 * // Usage
 * const success = trackPurchase({ value: 100, currency: 'CZK' })
 * ```
 */
export function createTracker<TGlobalFn, TParams>(
  getGlobalFn: () => TGlobalFn | null,
  trackFn: (globalFn: TGlobalFn, params: TParams) => void,
  debug?: boolean,
  adapterKey?: string,
): (params: TParams) => boolean {
  return (params: TParams): boolean => {
    const globalFn = getGlobalFn()

    if (!globalFn) {
      if (debug) {
        console.warn(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Global function not available`,
        )
      }
      return false
    }

    try {
      trackFn(globalFn, params)
      if (debug) {
        console.log(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Event tracked`,
        )
      }
      return true
    } catch (error) {
      if (debug) {
        console.error(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Tracking error:`,
          error,
        )
      }
      return false
    }
  }
}

/**
 * Creates a simple tracking function without parameters
 *
 * @example
 * ```ts
 * const trackPageview = createSimpleTracker(
 *   getLhi,
 *   (lhi) => lhi('pageview'),
 *   debug,
 *   'leadhub'
 * )
 * ```
 */
export function createSimpleTracker<TGlobalFn>(
  getGlobalFn: () => TGlobalFn | null,
  trackFn: (globalFn: TGlobalFn) => void,
  debug?: boolean,
  adapterKey?: string,
): () => boolean {
  return (): boolean => {
    const globalFn = getGlobalFn()

    if (!globalFn) {
      if (debug) {
        console.warn(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Global function not available`,
        )
      }
      return false
    }

    try {
      trackFn(globalFn)
      if (debug) {
        console.log(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Event tracked`,
        )
      }
      return true
    } catch (error) {
      if (debug) {
        console.error(
          `[Analytics${adapterKey ? `:${adapterKey}` : ""}] Tracking error:`,
          error,
        )
      }
      return false
    }
  }
}
