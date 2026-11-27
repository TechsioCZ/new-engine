"use client"

/* Requested appearance is persisted by better-themes. This provider alone
 * projects brand capabilities + OS appearance onto the effective root scheme,
 * and applies brands given as data: it renders each brand's stylesheet, so a
 * brand added or changed at runtime takes effect without a reload. */
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
  type BrandDefinition,
  brandStylesheet,
  brandUIDefaults,
  type ColorMode,
  MODE_STORAGE_KEY,
  type ModeSetting,
  resolveAppearance,
} from "./theme-config"
import { UIProvider } from "./ui-provider"

const DEFAULT_MODE: ModeSetting = "system"

function readStoredBrand(): string | null {
  try {
    return window.localStorage.getItem(BRAND_STORAGE_KEY)
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

function findBrand(
  brands: readonly BrandDefinition[],
  key: string | null | undefined
): BrandDefinition | undefined {
  return key ? brands.find((brand) => brand.key === key) : undefined
}

/** A short, stable name for one version of a brand's stylesheet. */
function hash(text: string): string {
  let value = 7
  for (let index = 0; index < text.length; index++) {
    value = (value * 31 + text.charCodeAt(index)) % 2_147_483_647
  }
  return value.toString(36)
}

/** A brand's stylesheet, hoisted into <head> and deduplicated by React. A
 * changed brand gets a new `href`, so its new tokens replace the old ones. */
export function BrandStyle({
  brand,
  nonce,
}: {
  brand: BrandDefinition
  nonce?: string
}) {
  const css = brandStylesheet(brand)
  return (
    <style
      href={`ui-brand-${brand.key}-${hash(css)}`}
      nonce={nonce}
      // biome-ignore lint/suspicious/noUnknownAttribute: React 19 hoists and deduplicates precedence styles
      precedence="ui-brand"
    >
      {css}
    </style>
  )
}

export type UseAppThemeResult = {
  /** The brand in effect here: the app's, or the nearest `BrandScope`'s. */
  brand: BrandDefinition
  /** The brands the app offers. */
  brands: readonly BrandDefinition[]
  setBrand: (key: string) => void
  /** Requested preference; retained while a single-mode brand is active. */
  mode: ModeSetting
  /** Effective appearance, after OS resolution and brand capability constraints. */
  resolvedMode: ColorMode
  setMode: (mode: ModeSetting) => void
  /** Only the modes the brand supports; one entry means there is no choice. */
  availableModes: ModeSetting[]
  /** False during SSR and the first client render. */
  mounted: boolean
}
const AppThemeContext = createContext<UseAppThemeResult | null>(null)

type BrandSelection = {
  brands: readonly BrandDefinition[]
  /** Controlled brand key. The app decides; nothing is persisted. */
  brand?: string
  /** Called when a toggler picks a brand while `brand` is controlled. */
  onBrandChange?: (key: string) => void
  /** Uncontrolled initial brand key; the user's pick is persisted. Defaults to
   * the first brand. */
  defaultBrand?: string
  defaultMode: ModeSetting
  nonce?: string
}

function BrandProvider({
  brands,
  brand: controlledKey,
  onBrandChange,
  defaultBrand,
  defaultMode,
  nonce,
  children,
}: PropsWithChildren<BrandSelection>) {
  const { theme, setTheme } = useTheme()
  const [storedKey, setStoredKey] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const system = useSyncExternalStore(
    subscribeAppearance,
    getAppearance,
    getServerAppearance
  )
  const fallback = findBrand(brands, defaultBrand) ?? brands[0]
  const controlled = controlledKey !== undefined
  const brand = controlled
    ? findBrand(brands, controlledKey)
    : (findBrand(brands, mounted ? storedKey : null) ?? fallback)
  if (!brand) {
    throw new Error(
      controlled
        ? `AppThemeProvider: brand "${controlledKey}" is not among the given brands`
        : "AppThemeProvider needs at least one brand"
    )
  }
  const mode =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : defaultMode
  const resolvedMode = resolveAppearance(brand, mode, system)

  useEffect(() => {
    setMounted(true)
    if (controlled) {
      return
    }
    setStoredKey(readStoredBrand())
    const onStorage = (event: StorageEvent) => {
      if (event.key !== BRAND_STORAGE_KEY && event.key !== null) {
        return
      }
      if (event.storageArea && event.storageArea !== window.localStorage) {
        return
      }
      setStoredKey(event.newValue)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [controlled])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.setAttribute("data-theme", brand.key)
    root.classList.remove("light", "dark")
    root.classList.add(resolvedMode)
    root.style.colorScheme = resolvedMode
  }, [brand.key, resolvedMode])

  const setBrand = (next: string) => {
    if (controlled) {
      onBrandChange?.(next)
      return
    }
    setStoredKey(next)
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
        brands,
        setBrand,
        mode,
        resolvedMode,
        setMode: setTheme,
        availableModes: availableModeSettings(brand),
        mounted,
      }}
    >
      <BrandStyle brand={brand} nonce={nonce} />
      <UIProvider {...brandUIDefaults(brand)}>{children}</UIProvider>
    </AppThemeContext.Provider>
  )
}

export type AppThemeProviderProps = PropsWithChildren<
  Omit<BrandSelection, "defaultMode"> & {
    defaultMode?: ModeSetting
  }
>

export function AppThemeProvider({
  defaultMode = DEFAULT_MODE,
  nonce,
  children,
  ...selection
}: AppThemeProviderProps) {
  return (
    <>
      <BrandThemeScript
        brand={selection.brand}
        brands={selection.brands}
        defaultBrand={selection.defaultBrand}
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
        <BrandProvider defaultMode={defaultMode} nonce={nonce} {...selection}>
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

/**
 * Applies a brand to one subtree, for a part of the app (a module's screens)
 * that brings its own brand or alters the inherited one with `extendBrand`.
 * Without a scope a subtree simply inherits the app's brand. A brand that
 * cannot render the inherited mode is shown in a mode it supports.
 */
export function BrandScope({
  brand,
  className,
  nonce,
  children,
}: PropsWithChildren<{
  brand: BrandDefinition
  className?: string
  nonce?: string
}>) {
  const parent = useAppTheme()
  const resolvedMode = resolveAppearance(
    brand,
    parent.resolvedMode,
    parent.resolvedMode
  )
  const modeClass =
    resolvedMode === parent.resolvedMode ? undefined : resolvedMode
  return (
    <AppThemeContext.Provider
      value={{
        ...parent,
        brand,
        resolvedMode,
        availableModes: availableModeSettings(brand),
      }}
    >
      <BrandStyle brand={brand} nonce={nonce} />
      <div
        className={
          [modeClass, className].filter(Boolean).join(" ") || undefined
        }
        data-theme={brand.key}
      >
        <UIProvider {...brandUIDefaults(brand)}>{children}</UIProvider>
      </div>
    </AppThemeContext.Provider>
  )
}

/** Render early in head/body when content precedes AppThemeProvider. The same
 * atomic bootstrap is included by the provider; neither script persists data. */
export function BrandThemeScript({
  brands,
  brand,
  defaultBrand,
  defaultMode = DEFAULT_MODE,
  nonce,
}: {
  brands: readonly BrandDefinition[]
  /** Controlled brand: stored picks are ignored. */
  brand?: string
  defaultBrand?: string
  defaultMode?: ModeSetting
  nonce?: string
}) {
  const modes = Object.fromEntries(
    brands.map((entry) => [entry.key, entry.modes])
  )
  const initial =
    brand ?? findBrand(brands, defaultBrand)?.key ?? brands[0]?.key ?? ""
  const script = `(function(){var b=${JSON.stringify(initial)},m=${JSON.stringify(defaultMode)},r=${JSON.stringify(modes)},c=${JSON.stringify(brand !== undefined)};try{var s=c?null:localStorage.getItem(${JSON.stringify(BRAND_STORAGE_KEY)});if(s&&Object.prototype.hasOwnProperty.call(r,s)){b=s;}var t=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(t==='light'||t==='dark'||t==='system'){m=t;}}catch(e){}if(!Object.prototype.hasOwnProperty.call(r,b)){return;}var e=document.documentElement,w=m==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m,k=r[b].indexOf(w)>=0?w:r[b][0];e.setAttribute('data-theme',b);e.classList.remove('light','dark');e.classList.add(k);e.style.colorScheme=k;})();`
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: synchronous pre-paint brand/capability bootstrap
      dangerouslySetInnerHTML={{ __html: script }}
      nonce={nonce}
      suppressHydrationWarning
    />
  )
}
