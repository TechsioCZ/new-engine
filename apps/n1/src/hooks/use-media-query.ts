import { useEffect, useState } from "react"

const breakpoints = {
  sm: "(min-width: 640px)",
  md: "(min-width: 768px)",
  lg: "(min-width: 1024px)",
  xl: "(min-width: 1280px)",
  header: "(min-width: 896px)",
  "2xl": "(min-width: 1536px)",
} as const

type Breakpoint = keyof typeof breakpoints

export function useMediaQuery(query: string): boolean {
  // Resolve breakpoint key to actual media query
  const mediaQuery =
    query in breakpoints ? breakpoints[query as Breakpoint] : query

  const [matches, setMatches] = useState(() => {
    // SSR safe - return false on server
    if (typeof window === "undefined") {
      return false
    }
    return window.matchMedia(mediaQuery).matches
  })

  useEffect(() => {
    const mql = window.matchMedia(mediaQuery)

    // Update state on mount (handles SSR hydration)
    setMatches(mql.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setMatches(e.matches)
    }

    mql.addEventListener("change", handleChange)
    return () => mql.removeEventListener("change", handleChange)
  }, [mediaQuery])

  return matches
}
