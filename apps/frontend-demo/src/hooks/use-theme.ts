"use client"

import { useAppTheme } from "@techsio/ui-kit/theme/theme-provider"
import { useSyncExternalStore } from "react"

const unsubscribeFromHydration = () => {
  // The hydration snapshot is immutable, so there is no cleanup work.
}
const subscribeToHydration = () => unsubscribeFromHydration
const getClientHydrationSnapshot = () => true
const getServerHydrationSnapshot = () => false

/**
 * Demo theme hook. Wraps the UI-kit useAppTheme(), preserving the prior
 * mode-toggle shape ({ theme, setTheme, toggleTheme, mounted }) and adding the
 * brand axis. `mounted` gates rendering to avoid SSR/client mismatch.
 */
export const useTheme = () => {
  const { resolvedMode, setMode, brand, setBrand, brands, availableModes } =
    useAppTheme()
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  )

  const toggleTheme = () => {
    setMode(resolvedMode === "dark" ? "light" : "dark")
  }

  return {
    brand,
    brands,
    canToggleMode: availableModes.length > 1,
    mounted,
    setBrand,
    setTheme: setMode,
    theme: mounted ? resolvedMode : "light",
    toggleTheme,
  }
}
