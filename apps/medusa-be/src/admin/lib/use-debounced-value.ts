import { useEffect, useState } from "react"

export const useDebouncedValue = <TValue>(
  value: TValue,
  delayMs = 300
): TValue => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => window.clearTimeout(timeout)
  }, [delayMs, value])

  return debouncedValue
}
