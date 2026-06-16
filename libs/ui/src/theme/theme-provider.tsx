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
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from "react"
import {
  availableModeSettings,
  BRAND_STORAGE_KEY,
  type BrandKey,
  brandAttr,
  brandKeys,
  brandSupportsDark,
  type ColorMode,
  DEFAULT_BRAND,
  DEFAULT_MODE,
  isBrandKey,
  MODE_STORAGE_KEY,
  type ModeSetting,
} from "./theme-config"

function readStoredBrand(): BrandKey | null {
  if (typeof window === "undefined") {
    return null
  }
  const value = window.localStorage.getItem(BRAND_STORAGE_KEY)
  return value && isBrandKey(value) ? value : null
}

function persistBrand(brand: BrandKey): void {
  if (typeof window === "undefined") {
    return
  }
  try {
    window.localStorage.setItem(BRAND_STORAGE_KEY, brand)
  } catch {
    // Storage may be unavailable (private mode / quota); brand still applies for the session.
  }
}

function applyBrandAttr(brand: BrandKey): void {
  if (typeof document === "undefined") {
    return
  }
  const attr = brandAttr(brand)
  const root = document.documentElement
  if (attr) {
    root.setAttribute("data-theme", attr)
  } else {
    root.removeAttribute("data-theme")
  }
}

type BrandContextValue = {
  brand: BrandKey
  setBrand: (brand: BrandKey) => void
}

const BrandContext = createContext<BrandContextValue | null>(null)

function BrandProvider({
  defaultBrand,
  children,
}: PropsWithChildren<{ defaultBrand: BrandKey }>) {
  const { setTheme } = useTheme()
  const [brand, setBrandState] = useState<BrandKey>(defaultBrand)

  // Hydrate from storage after mount to avoid SSR/client markup mismatch.
  useEffect(() => {
    const stored = readStoredBrand()
    if (stored) {
      setBrandState(stored)
    }
  }, [])

  // Apply + persist whenever the brand changes; lock light-only brands to light.
  useEffect(() => {
    applyBrandAttr(brand)
    persistBrand(brand)
    if (!brandSupportsDark(brand)) {
      setTheme("light")
    }
  }, [brand, setTheme])

  return (
    <BrandContext.Provider value={{ brand, setBrand: setBrandState }}>
      {children}
    </BrandContext.Provider>
  )
}

type AppThemeProviderProps = PropsWithChildren<{
  defaultBrand?: BrandKey
  defaultMode?: ModeSetting
}>

export function AppThemeProvider({
  defaultBrand = DEFAULT_BRAND,
  defaultMode = DEFAULT_MODE,
  children,
}: AppThemeProviderProps) {
  return (
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
}

export type UseAppThemeResult = {
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
}

export function useAppTheme(): UseAppThemeResult {
  const brandCtx = useContext(BrandContext)
  if (!brandCtx) {
    throw new Error("useAppTheme must be used within AppThemeProvider")
  }
  const { theme, systemTheme, setTheme } = useTheme()
  const { brand, setBrand } = brandCtx

  const mode = (theme ?? DEFAULT_MODE) as ModeSetting
  const resolvedMode: ColorMode =
    mode === "system" ? (systemTheme ?? "light") : mode

  return {
    brand,
    brands: brandKeys(),
    setBrand,
    mode,
    resolvedMode,
    setMode: (next: ModeSetting) => setTheme(next),
    availableModes: availableModeSettings(brand),
  }
}

/**
 * Pre-hydration script that applies the persisted brand's `data-theme` before
 * React mounts, preventing a flash of the default brand. Render inside <head>
 * (e.g. in a Next.js root layout). better-themes injects its own equivalent
 * script for the mode axis.
 */
export function BrandThemeScript({
  defaultBrand = DEFAULT_BRAND,
}: {
  defaultBrand?: BrandKey
}) {
  const attrByBrand: Record<string, string | undefined> = {}
  for (const key of brandKeys()) {
    attrByBrand[key] = brandAttr(key)
  }
  const script = `(function(){try{var k=localStorage.getItem(${JSON.stringify(
    BRAND_STORAGE_KEY
  )})||${JSON.stringify(defaultBrand)};var m=${JSON.stringify(
    attrByBrand
  )};var a=m[k];var e=document.documentElement;if(a){e.setAttribute('data-theme',a);}else{e.removeAttribute('data-theme');}}catch(e){}})();`

  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: required to inline the synchronous pre-hydration brand script
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  )
}
