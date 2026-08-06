"use client"

/*
 * App theme provider — composes two orthogonal axes behind one provider/hook:
 *   - mode  (light / dark / system) → owned by better-themes on the `class`
 *     attribute, which also sets `color-scheme` and ships a zero-flash script.
 *   - brand (base / neo / …)        → owned here on the `data-theme` attribute,
 *     persisted to localStorage with its own pre-hydration no-flash script.
 *
 * Consumers see a single <AppThemeProvider> and a single useAppTheme() hook.
 */

import { ThemeProvider as BetterThemesProvider, useTheme } from "better-themes"
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react"
import type { PropsWithChildren } from "react"

import {
  availableModeSettings,
  BRAND_STORAGE_KEY,
  brandAttr,
  brandKeys,
  brandSupportsDark,
  DEFAULT_BRAND,
  DEFAULT_MODE,
  isBrandKey,
  MODE_STORAGE_KEY,
} from "./theme-config"
import type { BrandKey, ColorMode, ModeSetting } from "./theme-config"

const readStoredBrand = (): BrandKey | null => {
  if (typeof window === "undefined") {
    return null
  }
  try {
    const value = window.localStorage.getItem(BRAND_STORAGE_KEY)
    return value !== null && isBrandKey(value) ? value : null
  } catch {
    // Storage may be unavailable (private mode / blocked cookies); fall back to default.
    return null
  }
}

const persistBrand = (brand: BrandKey): void => {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(BRAND_STORAGE_KEY, brand)
  } catch {
    // Storage may be unavailable (private mode / quota); brand still applies for the session.
  }
}

const applyBrandAttr = (brand: BrandKey): void => {
  if (typeof document === "undefined") {
    return
  }
  const attr = brandAttr(brand)
  const root = document.documentElement
  if (typeof attr === "string" && attr.length > 0) {
    Object.assign(root.dataset, { theme: attr })
  } else {
    Reflect.deleteProperty(root.dataset, "theme")
  }
}

const BrandContext = createContext<BrandKey | null>(null)
const BrandMountedContext = createContext(false)
const BrandSetterContext = createContext<((brand: BrandKey) => void) | null>(
  null,
)
const subscribeToHydration = (onStoreChange: () => void): (() => void) => {
  window.addEventListener("pageshow", onStoreChange)
  return () => {
    window.removeEventListener("pageshow", onStoreChange)
  }
}
const getClientHydrationSnapshot = (): boolean => true
const getServerHydrationSnapshot = (): boolean => false

const BrandProvider = ({
  defaultBrand,
  children,
}: PropsWithChildren<{ defaultBrand: BrandKey }>) => {
  const { setTheme } = useTheme()
  // Lazy-init from storage so the first client render already matches what the
  // pre-hydration BrandThemeScript wrote to <html> — the apply effect below
  // then re-applies the same value instead of clobbering it (no brand flash).
  // On the server readStoredBrand() returns null, so SSR uses the default and
  // the provider renders no brand-dependent markup (consumers gate on mounted).
  const [brand, setBrand] = useState<BrandKey>(
    () => readStoredBrand() ?? defaultBrand,
  )
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  )

  // Apply + persist whenever the brand changes; lock light-only brands to light.
  useEffect(() => {
    applyBrandAttr(brand)
    persistBrand(brand)
    if (!brandSupportsDark(brand)) {
      setTheme("light")
    }
  }, [brand, setTheme])

  return (
    <BrandContext.Provider value={brand}>
      <BrandMountedContext.Provider value={mounted}>
        <BrandSetterContext.Provider value={setBrand}>
          {children}
        </BrandSetterContext.Provider>
      </BrandMountedContext.Provider>
    </BrandContext.Provider>
  )
}

type AppThemeProviderProps = PropsWithChildren<{
  defaultBrand?: BrandKey | undefined
  defaultMode?: ModeSetting | undefined
}>

export const AppThemeProvider = ({
  defaultBrand = DEFAULT_BRAND,
  defaultMode = DEFAULT_MODE,
  children,
}: AppThemeProviderProps) => (
  <BetterThemesProvider
    attribute="class"
    defaultTheme={defaultMode}
    disableTransitionOnChange
    enableSystem
    storageKey={MODE_STORAGE_KEY}
    themes={["light", "dark"]}
  >
    <BrandProvider defaultBrand={defaultBrand}>{children}</BrandProvider>
  </BetterThemesProvider>
)

export interface UseAppThemeResult {
  /** Active brand key. */
  brand: BrandKey
  /** All brand keys, for building a brand toggler. */
  brands: BrandKey[]
  setBrand: (brand: BrandKey) => void
  /** Current mode setting (may be "system"). */
  mode: ModeSetting
  /** Resolved concrete mode after applying "system". */
  resolvedMode: ColorMode
  setMode: (mode: ModeSetting) => void
  /** Mode settings allowed for the active brand (light-only brands get just light). */
  availableModes: ModeSetting[]
  /** False during SSR and the first client render; gate brand-dependent UI on it. */
  mounted: boolean
}

const isModeSetting = (value: unknown): value is ModeSetting =>
  value === "light" || value === "dark" || value === "system"

const isColorMode = (value: unknown): value is ColorMode =>
  value === "light" || value === "dark"

const resolveColorMode = (
  mode: ModeSetting,
  systemTheme: unknown,
): ColorMode => {
  if (mode !== "system") {
    return mode
  }
  return isColorMode(systemTheme) ? systemTheme : "light"
}

export const useAppTheme = (): UseAppThemeResult => {
  const brand = useContext(BrandContext)
  const mounted = useContext(BrandMountedContext)
  const setBrand = useContext(BrandSetterContext)
  if (brand === null || setBrand === null) {
    throw new Error("useAppTheme must be used within AppThemeProvider")
  }
  const { theme, systemTheme, setTheme } = useTheme()

  const mode = isModeSetting(theme) ? theme : DEFAULT_MODE
  const resolvedMode = resolveColorMode(mode, systemTheme)

  // Light-only brands reject dark/system so the hook contract stays consistent
  // even if a caller bypasses availableModes.
  const setMode = (next: ModeSetting) => {
    if (next === "light" || brandSupportsDark(brand)) {
      setTheme(next)
    }
  }

  return {
    availableModes: availableModeSettings(brand),
    brand,
    brands: brandKeys(),
    mode,
    mounted,
    resolvedMode,
    setBrand,
    setMode,
  }
}

/**
 * Pre-hydration script that applies the persisted brand's `data-theme` before
 * the page paints, preventing a flash of the default brand. Render it as early
 * as possible: in `<head>`, or — for the Next.js App Router, which does not
 * allow arbitrary `<head>` children in a layout — as the first child of
 * `<body>`, where it still runs synchronously before any body content renders.
 * better-themes injects its own equivalent script for the mode axis.
 */
interface BrandThemeScriptProps {
  defaultBrand?: BrandKey | undefined
}

const brandThemeScript = ({
  defaultBrand = DEFAULT_BRAND,
}: BrandThemeScriptProps) => {
  const attrByBrand: Record<string, string | undefined> = {}
  for (const key of brandKeys()) {
    attrByBrand[key] = brandAttr(key)
  }
  const script = `(function(){try{var d=${JSON.stringify(
    defaultBrand,
  )};var m=${JSON.stringify(attrByBrand)};var k=localStorage.getItem(${JSON.stringify(
    BRAND_STORAGE_KEY,
  )});if(!k||!Object.prototype.hasOwnProperty.call(m,k)){k=d;}var a=m[k];var e=document.documentElement;if(a){e.setAttribute('data-theme',a);}else{e.removeAttribute('data-theme');}}catch(e){}})();`
  return createElement("script", { suppressHydrationWarning: true }, script)
}

const themeComponents = { BrandThemeScript: brandThemeScript }
export const { BrandThemeScript } = themeComponents
