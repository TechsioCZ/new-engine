import { useEffect, useReducer } from "react"

import { debounce } from "@/utils/debounce"
import type { DebouncedFunction } from "@/utils/debounce"

export const useDebounce = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  options?: {
    leading?: boolean
  },
): DebouncedFunction<Args> => {
  const [debouncedFn] = useReducer(
    (current: DebouncedFunction<Args>) => current,
    undefined,
    () => debounce(callback, delay, options),
  )

  useEffect(() => {
    debouncedFn.update(callback, delay, options)
  }, [callback, debouncedFn, delay, options])

  useEffect(
    () => () => {
      debouncedFn.cancel()
    },
    [debouncedFn],
  )

  return debouncedFn
}
