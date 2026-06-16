"use client"

import { useAppTheme } from "@techsio/ui-kit/theme/theme-provider"
import { useEffect, useState } from "react"

/**
 * Demo theme hook. Wraps the UI-kit useAppTheme(), preserving the prior
 * mode-toggle shape ({ theme, setTheme, toggleTheme, mounted }) and adding the
 * brand axis. `mounted` gates rendering to avoid SSR/client mismatch.
 */
export function useTheme() {
  const { resolvedMode, setMode, brand, setBrand, brands, availableModes } =
    useAppTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setMode(resolvedMode === "dark" ? "light" : "dark")
  }

  return {
    theme: mounted ? resolvedMode : "light",
    setTheme: setMode,
    toggleTheme,
    mounted,
    brand,
    setBrand,
    brands,
    canToggleMode: availableModes.length > 1,
  }
}
