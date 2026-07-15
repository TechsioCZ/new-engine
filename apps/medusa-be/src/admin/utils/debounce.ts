type DebouncedFunction<TArguments extends unknown[]> = ((
  ...arguments_: TArguments
) => void) & {
  cancel: () => void
}

export function debounce<TArguments extends unknown[]>(
  callback: (...arguments_: TArguments) => void,
  delay: number
): DebouncedFunction<TArguments> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const debounced = (...arguments_: TArguments) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      timeoutId = undefined
      callback(...arguments_)
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  return debounced
}
