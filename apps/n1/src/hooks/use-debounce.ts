import { useEffect, useMemo, useRef } from "react"

import { type DebouncedFunction, debounce } from "@/utils/debounce"

export function useDebounce<Args extends unknown[], R>(
  callback: (...args: Args) => R,
  delay: number,
  options?: {
    leading?: boolean
  }
): DebouncedFunction<Args> {
  const callbackRef = useRef(callback)

  // Always update callback ref to latest version
  callbackRef.current = callback

  // Create debounced function synchronously during render (not after)
  const debouncedFn = useMemo(
    () =>
      debounce(
        (...args: Args) => {
          callbackRef.current(...args)
        },
        delay,
        options
      ),
    [delay, options?.leading, options] // Recreate if delay or leading option changes
  )

  // Cleanup: cancel pending execution on unmount or dependency change
  useEffect(
    () => () => {
      debouncedFn.cancel()
    },
    [debouncedFn]
  )

  return debouncedFn
}
