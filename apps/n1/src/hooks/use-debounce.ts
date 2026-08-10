import { debounce } from "@techsio/std/function"
import type { DebouncedFunction } from "@techsio/std/function"
import { useEffect, useReducer } from "react"

interface UpdatableDebouncedFunction<
  TThis,
  Args extends unknown[],
> extends DebouncedFunction<TThis, Args> {
  update: (
    callback: (this: TThis, ...args: Args) => void,
    delay: number,
    options?: { leading?: boolean },
  ) => void
}

const createUpdatableDebouncedFunction = <TThis, Args extends unknown[]>(
  callback: (this: TThis, ...args: Args) => void,
  delay: number,
  options?: { leading?: boolean },
): UpdatableDebouncedFunction<TThis, Args> => {
  let pending: DebouncedFunction<TThis, Args> | null = null
  let currentCallback = callback
  let currentDelay = delay
  let leading = options?.leading === true

  const debounced = function debounced(this: TThis, ...args: Args): void {
    if (leading && pending === null) {
      Reflect.apply(currentCallback, this, args)
      pending = debounce(() => {
        pending = null
      }, currentDelay)
      Reflect.apply(pending, this, args)
      return
    }

    pending?.cancel()
    pending = debounce(function invokeLatest(this: TThis, ...latestArgs: Args) {
      pending = null
      Reflect.apply(currentCallback, this, latestArgs)
    }, currentDelay)
    Reflect.apply(pending, this, args)
  }

  debounced.cancel = () => {
    pending?.cancel()
    pending = null
  }

  debounced.update = (
    nextCallback: (this: TThis, ...args: Args) => void,
    nextDelay: number,
    nextOptions?: { leading?: boolean },
  ) => {
    currentCallback = nextCallback
    currentDelay = nextDelay
    leading = nextOptions?.leading === true
  }

  return debounced
}

export const useDebounce = <Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
  options?: {
    leading?: boolean
  },
): DebouncedFunction<unknown, Args> => {
  const [debouncedFn] = useReducer(
    (current: UpdatableDebouncedFunction<unknown, Args>) => current,
    undefined,
    () => createUpdatableDebouncedFunction(callback, delay, options),
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
