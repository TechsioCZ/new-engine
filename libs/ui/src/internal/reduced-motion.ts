import { useSyncExternalStore } from "react"

const QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

/*
 * True when the user asked the OS to reduce motion. For JS-driven motion
 * (autoplay, chart animation) that `motion-reduce:` classes cannot reach.
 * The server snapshot assumes reduced motion so nothing starts moving before
 * hydration has read the real preference.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true
  )
}
