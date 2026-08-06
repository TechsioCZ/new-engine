export const noop = (): void => undefined

export const assertNever = (
  value: never,
  message = "Unexpected value",
): never => {
  throw new Error(`${message}: ${String(value)}`)
}

export interface DebouncedFunction<TThis, TArgs extends unknown[]> {
  (this: TThis, ...args: TArgs): void
  cancel: () => void
}

export const debounce = <TThis, TArgs extends unknown[]>(
  fn: (this: TThis, ...args: TArgs) => void,
  milliseconds: number,
): DebouncedFunction<TThis, TArgs> => {
  let timeout: ReturnType<typeof setTimeout> | null = null

  const debounced = function debounced(this: TThis, ...args: TArgs): void {
    if (timeout !== null) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      timeout = null
      Reflect.apply(fn, this, args)
    }, milliseconds)
  }

  debounced.cancel = () => {
    if (timeout !== null) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}
