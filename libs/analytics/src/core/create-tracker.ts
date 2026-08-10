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
export const createTracker = <TGlobalFn, TParams>(
  getGlobalFn: () => TGlobalFn | null,
  trackFn: (globalFn: TGlobalFn, params: TParams) => void,
  debug = false,
  adapterKey?: string,
): ((params: TParams) => boolean) => {
  const adapterSuffix =
    adapterKey === undefined || adapterKey.length === 0 ? "" : `:${adapterKey}`
  const logPrefix = `[Analytics${adapterSuffix}]`

  return (params: TParams): boolean => {
    const globalFn = getGlobalFn()

    if (globalFn === null) {
      if (debug) {
        console.warn(`${logPrefix} Global function not available`)
      }
      return false
    }

    try {
      trackFn(globalFn, params)
      if (debug) {
        console.log(`${logPrefix} Event tracked`)
      }
      return true
    } catch (error) {
      if (debug) {
        console.error(`${logPrefix} Tracking error:`, error)
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
export const createSimpleTracker = <TGlobalFn>(
  getGlobalFn: () => TGlobalFn | null,
  trackFn: (globalFn: TGlobalFn) => void,
  debug = false,
  adapterKey?: string,
): (() => boolean) => {
  const adapterSuffix =
    adapterKey === undefined || adapterKey.length === 0 ? "" : `:${adapterKey}`
  const logPrefix = `[Analytics${adapterSuffix}]`

  return (): boolean => {
    const globalFn = getGlobalFn()

    if (globalFn === null) {
      if (debug) {
        console.warn(`${logPrefix} Global function not available`)
      }
      return false
    }

    try {
      trackFn(globalFn)
      if (debug) {
        console.log(`${logPrefix} Event tracked`)
      }
      return true
    } catch (error) {
      if (debug) {
        console.error(`${logPrefix} Tracking error:`, error)
      }
      return false
    }
  }
}
