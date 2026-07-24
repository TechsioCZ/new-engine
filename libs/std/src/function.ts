export const noop = (): void => undefined

export const assertNever = (
  value: never,
  message = "Unexpected value"
): never => {
  throw new Error(`${message}: ${String(value)}`)
}

export const debounce = <TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  milliseconds: number
): ((...args: TArgs) => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined

  return (...args) => {
    if (timeout !== undefined) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => callback(...args), milliseconds)
  }
}
