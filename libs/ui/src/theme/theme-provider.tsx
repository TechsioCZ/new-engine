"use client"

/* Requested appearance is persisted by better-themes. This provider alone
 * projects brand capabilities + OS appearance onto the effective root scheme. */
import { ThemeProvider as BetterThemesProvider, useTheme } from "better-themes"
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
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
  try {
    const value = window.localStorage.getItem(BRAND_STORAGE_KEY)
    return value && isBrandKey(value) ? value : null
  } catch {
    return null
  }
}

function subscribeAppearance(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)")
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}
const getAppearance = (): ColorMode =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
const getServerAppearance = (): ColorMode => "light"

export function resolveAppearance(
  brand: BrandKey,
  requested: ModeSetting,
  system: ColorMode
): ColorMode {
  if (!brandSupportsDark(brand)) {
    return "light"
  }
  return requested === "system" ? system : requested
}

export type UseAppThemeResult = {
  brand: BrandKey
  brands: BrandKey[]
  setBrand: (brand: BrandKey) => void
  /** Requested preference; retained while a light-only brand is active. */
  mode: ModeSetting
  /** Effective appearance, after OS resolution and brand capability constraints. */
  resolvedMode: ColorMode
  setMode: (mode: ModeSetting) => void
  availableModes: ModeSetting[]
  /** False during SSR and the first client render. */
  mounted: boolean
}
const AppThemeContext = createContext<UseAppThemeResult | null>(null)

function BrandProvider({
  defaultBrand,
  defaultMode,
  children,
}: PropsWithChildren<{ defaultBrand: BrandKey; defaultMode: ModeSetting }>) {
  const { theme, setTheme } = useTheme()
  const [brand, setBrandState] = useState<BrandKey>(
    () => readStoredBrand() ?? defaultBrand
  )
  const [mounted, setMounted] = useState(false)
  const system = useSyncExternalStore(
    subscribeAppearance,
    getAppearance,
    getServerAppearance
  )
  const mode =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : defaultMode
  const resolvedMode = resolveAppearance(brand, mode, system)

  useEffect(() => {
    setMounted(true)
    const onStorage = (event: StorageEvent) => {
      if (event.key !== BRAND_STORAGE_KEY && event.key !== null) {
        return
      }
      if (event.storageArea && event.storageArea !== window.localStorage) {
        return
      }
      const value = event.newValue
      setBrandState(value && isBrandKey(value) ? value : defaultBrand)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [defaultBrand])

  useLayoutEffect(() => {
    const root = document.documentElement
    const attr = brandAttr(brand)
    if (attr) {
      root.setAttribute("data-theme", attr)
    } else {
      root.removeAttribute("data-theme")
    }
    root.classList.remove("light", "dark")
    root.classList.add(resolvedMode)
    root.style.colorScheme = resolvedMode
  }, [brand, resolvedMode])

  const setBrand = (next: BrandKey) => {
    setBrandState(next)
    // Persist user intent only; incoming storage events never echo stale values.
    try {
      window.localStorage.setItem(BRAND_STORAGE_KEY, next)
    } catch {
      // Blocked storage does not prevent a session-local change.
    }
  }

  return (
    <AppThemeContext.Provider
      value={{
        brand,
        brands: brandKeys(),
        setBrand,
        mode,
        resolvedMode,
        setMode: setTheme,
        availableModes: availableModeSettings(brand),
        mounted,
      }}
    >
      {children}
    </AppThemeContext.Provider>
  )
}

export type AppThemeProviderProps = PropsWithChildren<{
  defaultBrand?: BrandKey
  defaultMode?: ModeSetting
  /** Nonce for both synchronous theme bootstrap scripts under CSP. */
  nonce?: string
}>

export function AppThemeProvider({
  defaultBrand = DEFAULT_BRAND,
  defaultMode = DEFAULT_MODE,
  nonce,
  children,
}: AppThemeProviderProps) {
  return (
    <>
      <BrandThemeScript
        defaultBrand={defaultBrand}
        defaultMode={defaultMode}
        nonce={nonce}
      />
      <BetterThemesProvider
        // Never let the persistence layer paint an unconstrained appearance.
        attribute="data-requested-mode"
        defaultTheme={defaultMode}
        enableColorScheme={false}
        enableSystem
        nonce={nonce}
        storageKey={MODE_STORAGE_KEY}
        themes={["light", "dark"]}
      >
        <BrandProvider defaultBrand={defaultBrand} defaultMode={defaultMode}>
          {children}
        </BrandProvider>
      </BetterThemesProvider>
    </>
  )
}

export function useAppTheme(): UseAppThemeResult {
  const context = useContext(AppThemeContext)
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider")
  }
  return context
}

/** Render early in head/body when content precedes AppThemeProvider. The same
 * atomic bootstrap is included by the provider; neither script persists data. */
export function BrandThemeScript({
  defaultBrand = DEFAULT_BRAND,
  defaultMode = DEFAULT_MODE,
  nonce,
}: {
  defaultBrand?: BrandKey
  defaultMode?: ModeSetting
  nonce?: string
}) {
  const brands = Object.fromEntries(
    brandKeys().map((key) => [
      key,
      { attr: brandAttr(key) ?? null, dark: brandSupportsDark(key) },
    ])
  )
  const script = `(function(){var b=${JSON.stringify(defaultBrand)},m=${JSON.stringify(defaultMode)},r=${JSON.stringify(brands)};try{var s=localStorage.getItem(${JSON.stringify(BRAND_STORAGE_KEY)});if(s&&Object.prototype.hasOwnProperty.call(r,s)){b=s;}var t=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(t==='light'||t==='dark'||t==='system'){m=t;}}catch(e){}var e=document.documentElement,a=r[b].attr;if(a){e.setAttribute('data-theme',a);}else{e.removeAttribute('data-theme');}var c=r[b].dark?(m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m):'light';e.classList.remove('light','dark');e.classList.add(c);e.style.colorScheme=c;})();`
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: synchronous pre-paint brand/capability bootstrap
      dangerouslySetInnerHTML={{ __html: script }}
      nonce={nonce}
      suppressHydrationWarning
    />
  )
}
