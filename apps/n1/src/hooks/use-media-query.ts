import { useSyncExternalStore } from "react"

const breakpoints = {
  "2xl": "(min-width: 1536px)",
  header: "(min-width: 896px)",
  lg: "(min-width: 1024px)",
  md: "(min-width: 768px)",
  sm: "(min-width: 640px)",
  xl: "(min-width: 1280px)",
} as const

const resolveMediaQuery = (query: string): string =>
  Object.entries(breakpoints).find(
    ([breakpoint]) => breakpoint === query,
  )?.[1] ?? query

export const useMediaQuery = (query: string): boolean => {
  const mediaQuery = resolveMediaQuery(query)

  return useSyncExternalStore(
    (onStoreChange) => {
      const queryList = window.matchMedia(mediaQuery)
      queryList.addEventListener("change", onStoreChange)
      return () => {
        queryList.removeEventListener("change", onStoreChange)
      }
    },
    () => window.matchMedia(mediaQuery).matches,
    () => false,
  )
}
