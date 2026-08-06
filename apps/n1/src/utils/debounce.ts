export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void
  cancel: () => void
  update: (
    fn: (...args: Args) => void,
    delay: number,
    options?: { leading?: boolean },
  ) => void
}

export const debounce = <Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
  options?: {
    leading?: boolean
  },
): DebouncedFunction<Args> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Args | null = null
  let currentFn = fn
  let currentDelay = delay
  let leading = options?.leading === true

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  const debouncedFn = (...args: Args): void => {
    lastArgs = args

    if (leading && timeoutId === null) {
      currentFn(...args)
      timeoutId = setTimeout(() => {
        timeoutId = null
        lastArgs = null
      }, currentDelay)
      return
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      if (lastArgs !== null) {
        currentFn(...lastArgs)
      }
      timeoutId = null
      lastArgs = null
    }, currentDelay)
  }

  debouncedFn.cancel = cancel
  debouncedFn.update = (
    nextFn: (...args: Args) => void,
    nextDelay: number,
    nextOptions?: { leading?: boolean },
  ) => {
    currentFn = nextFn
    currentDelay = nextDelay
    leading = nextOptions?.leading === true
  }

  return debouncedFn
}
