"use client"

import { useCallback, useSyncExternalStore } from "react"

export const mediaQueryBreakpoints = {
  xs: "(min-width: 30rem)",
  sm: "(min-width: 40rem)",
  md: "(min-width: 48rem)",
  lg: "(min-width: 64rem)",
  xl: "(min-width: 80rem)",
  "2xl": "(min-width: 88.75rem)",
} as const

export type MediaQueryBreakpoint = keyof typeof mediaQueryBreakpoints

type UseMediaQueryOptions = {
  defaultMatches?: boolean
}

const noop = () => null

function resolveMediaQuery(query: MediaQueryBreakpoint | string) {
  return Object.hasOwn(mediaQueryBreakpoints, query)
    ? mediaQueryBreakpoints[query as MediaQueryBreakpoint]
    : query
}

export function useMediaQuery(
  query: MediaQueryBreakpoint | string,
  { defaultMatches = false }: UseMediaQueryOptions = {}
) {
  const mediaQuery = resolveMediaQuery(query)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === "undefined") {
        return noop
      }

      const mediaQueryList = window.matchMedia(mediaQuery)
      mediaQueryList.addEventListener("change", onStoreChange)

      return () => mediaQueryList.removeEventListener("change", onStoreChange)
    },
    [mediaQuery]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") {
      return defaultMatches
    }

    return window.matchMedia(mediaQuery).matches
  }, [defaultMatches, mediaQuery])

  const getServerSnapshot = useCallback(() => defaultMatches, [defaultMatches])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
