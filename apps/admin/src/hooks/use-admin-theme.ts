import { useEffect, useState } from "react"
import {
  type AdminResolvedTheme,
  type AdminThemePreference,
  applyAdminThemePreference,
  getStoredAdminThemePreference,
  resolveAdminTheme,
  storeAdminThemePreference,
} from "../utils/theme"

export function useAdminTheme() {
  const [preference, setPreferenceState] = useState<AdminThemePreference>(
    getStoredAdminThemePreference
  )
  const [resolvedTheme, setResolvedTheme] = useState<AdminResolvedTheme>(() =>
    resolveAdminTheme(getStoredAdminThemePreference())
  )

  useEffect(() => {
    applyAdminThemePreference(preference)
    setResolvedTheme(resolveAdminTheme(preference))

    if (preference !== "system") {
      return
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setResolvedTheme(mediaQuery.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [preference])

  function setPreference(nextPreference: AdminThemePreference) {
    storeAdminThemePreference(nextPreference)
    applyAdminThemePreference(nextPreference)
    setPreferenceState(nextPreference)
    setResolvedTheme(resolveAdminTheme(nextPreference))
  }

  return {
    resolvedTheme,
    setPreference,
  }
}
