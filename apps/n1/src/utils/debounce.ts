export interface DebouncedFunction<Args extends unknown[]> {
  (...args: Args): void
  cancel: () => void
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number,
  options?: {
    leading?: boolean
  },
): DebouncedFunction<Args> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Args | null = null

  const cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
      lastArgs = null
    }
  }

  const debouncedFn = (...args: Args): void => {
    lastArgs = args

    if (options?.leading && timeoutId === null) {
      fn(...args)
      timeoutId = setTimeout(() => {
        timeoutId = null
        lastArgs = null
      }, delay)
      return
    }

    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      if (lastArgs !== null) {
        fn(...lastArgs)
      }
      timeoutId = null
      lastArgs = null
    }, delay)
  }

  debouncedFn.cancel = cancel

  return debouncedFn
}
