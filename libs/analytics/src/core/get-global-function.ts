/**
 * Shared utility for safely accessing global window functions
 * Eliminates DRY violations across analytics hooks
 */

/**
 * Creates a type-safe getter for a global window function
 *
 * @param keys - Single key or array of keys to check on window object
 * @param isExpectedFunction - Runtime validator for the expected function type
 * @returns A function that returns the validated global function or null
 *
 * @example
 * ```ts
 * // Single key
 * const getGtag = createWindowGetter<GtagFunction>('gtag')
 *
 * // Multiple keys (Leadhub uses both 'lhi' and 'LHInsights')
 * const getLhi = createWindowGetter<LeadhubFunction>(['lhi', 'LHInsights'])
 * ```
 */
export const createWindowGetter = <T extends CallableFunction>(
  keys: string | string[],
  isExpectedFunction: (value: unknown) => value is T = (value): value is T =>
    typeof value === "function",
): (() => T | null) => {
  const keyArray = Array.isArray(keys) ? keys : [keys]

  return function getWindowFunction(): T | null {
    if (typeof window === "undefined") {
      return null
    }

    for (const key of keyArray) {
      const value: unknown = Reflect.get(window, key)
      if (isExpectedFunction(value)) {
        return value
      }
    }

    return null
  }
}
