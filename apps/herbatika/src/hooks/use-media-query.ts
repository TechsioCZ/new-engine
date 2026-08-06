"use client"

import { noop } from "@techsio/std/function"
import { useSyncExternalStore } from "react"

const mediaQueryBreakpoints = {
  "2xl": "(min-width: 88.75rem)",
  lg: "(min-width: 64rem)",
  md: "(min-width: 48rem)",
  sm: "(min-width: 40rem)",
  xl: "(min-width: 80rem)",
  xs: "(min-width: 30rem)",
} as const

type MediaQueryBreakpoint = keyof typeof mediaQueryBreakpoints

interface UseMediaQueryOptions {
  defaultMatches?: boolean
}

const isMediaQueryBreakpoint = (query: string): query is MediaQueryBreakpoint =>
  Object.hasOwn(mediaQueryBreakpoints, query)

const resolveMediaQuery = (query: string) =>
  isMediaQueryBreakpoint(query) ? mediaQueryBreakpoints[query] : query

export const useMediaQuery = (
  query: string,
  { defaultMatches = false }: UseMediaQueryOptions = {},
) => {
  const mediaQuery = resolveMediaQuery(query)

  const subscribe = (onStoreChange: () => void) => {
    if (typeof window === "undefined") {
      return noop
    }

    const mediaQueryList = window.matchMedia(mediaQuery)
    mediaQueryList.addEventListener("change", onStoreChange)

    return () => {
      mediaQueryList.removeEventListener("change", onStoreChange)
    }
  }

  const getSnapshot = () => {
    if (typeof window === "undefined") {
      return defaultMatches
    }

    return window.matchMedia(mediaQuery).matches
  }

  const getServerSnapshot = () => defaultMatches

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
