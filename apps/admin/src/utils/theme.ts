export type AdminResolvedTheme = "dark" | "light"
export type AdminThemePreference = AdminResolvedTheme | "system"

export const ADMIN_THEME_STORAGE_KEY = "new-engine-admin-theme"

export function applyAdminThemePreference(preference: AdminThemePreference) {
  if (typeof document === "undefined") {
    return
  }

  const root = document.documentElement
  root.classList.remove("dark", "light")

  if (preference !== "system") {
    root.classList.add(preference)
  }

  root.dataset.adminTheme = preference
}

export function getStoredAdminThemePreference(): AdminThemePreference {
  if (typeof window === "undefined") {
    return "system"
  }

  try {
    return parseAdminThemePreference(
      window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    )
  } catch {
    return "system"
  }
}

export function resolveAdminTheme(
  preference: AdminThemePreference
): AdminResolvedTheme {
  if (preference !== "system") {
    return preference
  }

  return getSystemAdminTheme()
}

export function storeAdminThemePreference(preference: AdminThemePreference) {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (preference === "system") {
      window.localStorage.removeItem(ADMIN_THEME_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, preference)
  } catch {
    // Ignore storage failures; the active document theme still updates.
  }
}

function getSystemAdminTheme(): AdminResolvedTheme {
  if (typeof window === "undefined") {
    return "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function parseAdminThemePreference(value: string | null): AdminThemePreference {
  return value === "dark" || value === "light" ? value : "system"
}
