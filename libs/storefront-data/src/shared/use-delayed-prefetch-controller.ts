import { useEffect, useRef } from "react"

export const useDelayedPrefetchController = () => {
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )

  useEffect(() => {
    const timeouts = timeoutsRef.current
    return () => {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout)
      }
      timeouts.clear()
    }
  }, [])

  const schedulePrefetch = (
    execute: () => void,
    prefetchId: string,
    delay: number
  ) => {
    const existing = timeoutsRef.current.get(prefetchId)
    if (existing) {
      clearTimeout(existing)
    }

    const timeoutId = setTimeout(() => {
      execute()
      timeoutsRef.current.delete(prefetchId)
    }, delay)

    timeoutsRef.current.set(prefetchId, timeoutId)
    return prefetchId
  }

  const cancelPrefetch = (prefetchId: string) => {
    const timeout = timeoutsRef.current.get(prefetchId)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(prefetchId)
    }
  }

  return {
    schedulePrefetch,
    cancelPrefetch,
  }
}
