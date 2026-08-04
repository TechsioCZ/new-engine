"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { useAnalytics } from "@/providers/analytics-provider"

/**
 * Tracks pageviews on route changes (Leadhub only)
 * Place inside AnalyticsProvider in layout.tsx
 */
export function PageviewTracker() {
  const pathname = usePathname()
  const analytics = useAnalytics()
  const lastPathname = useRef<string | null>(null)

  useEffect(() => {
    // Skip if same pathname (prevents double tracking)
    if (lastPathname.current === pathname) {
      return
    }
    lastPathname.current = pathname

    analytics.trackPageview()
  }, [pathname, analytics])

  return null
}
