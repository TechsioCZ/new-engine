"use client"

/* Global style defaults for every component: one `size` and one `appearance`
 * (fill style) set near the root, optionally refined per component, and always
 * overridden by a prop on the component itself.
 *
 * Resolution order, first defined and supported value wins:
 *   1. the prop on the component
 *   2. `components[Name]` of the nearest UIProvider
 *   3. the global value of the nearest UIProvider
 *   4. the same two steps for each parent UIProvider, inner to outer
 *   5. the component's own default
 *
 * A provider value the component does not support (e.g. `appearance="ghost"`
 * on a component that has no ghost look) is skipped, so the component falls
 * back to the next level and finally to its own default. */
import { createContext, type PropsWithChildren, useContext } from "react"

/** Canonical fill styles shared by every component that has an `appearance`. */
export type UIAppearance = "solid" | "subtle" | "outline" | "ghost" | "plain"

/** The shared size scale. Each component accepts the subset it supports. */
export type UISize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full"

/** Color intent shared by every component that has a `severity`. */
export type UISeverity =
  | "primary"
  | "secondary"
  | "tertiary"
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "discount"

/** Per-component defaults. Values are typed loosely on purpose: a component
 * keeps its own scale (Dialog `full`, Icon `current`, Tabs `line` …). */
export type UIComponentDefaults = {
  size?: string
  appearance?: string
}

export type UIComponentName =
  | "Accordion"
  | "ActionIcon"
  | "Badge"
  | "Breadcrumb"
  | "Button"
  | "Carousel"
  | "CascadeSelect"
  | "Checkbox"
  | "ColorSelect"
  | "Combobox"
  | "DataTable"
  | "DatePicker"
  | "Dialog"
  | "Drawer"
  | "FacetFilterPanel"
  | "FileUpload"
  | "Footer"
  | "Header"
  | "Hotkeys"
  | "Icon"
  | "Image"
  | "Input"
  | "Label"
  | "Link"
  | "LinkButton"
  | "Menu"
  | "NumericInput"
  | "Pagination"
  | "PhoneInput"
  | "Popover"
  | "QuantityField"
  | "RadioCard"
  | "RadioGroup"
  | "Rating"
  | "SearchForm"
  | "Select"
  | "Skeleton"
  | "Slider"
  | "StatusText"
  | "Steps"
  | "Switch"
  | "Table"
  | "Tabs"
  | "Textarea"
  | "Tooltip"
  | "TreeView"
  | "VerticalNavigation"

export type UIDefaults = {
  /** Default size for every component that has a `size` prop. */
  size?: UISize
  /** Default fill style for every component that has an `appearance` prop. */
  appearance?: UIAppearance
  /** Per-component defaults; they win over the global values of the same provider. */
  components?: Partial<Record<UIComponentName, UIComponentDefaults>>
}

export type UIProviderProps = PropsWithChildren<UIDefaults>

type UIStyleKey = keyof UIComponentDefaults

// Outermost first; resolution walks it from the end.
const UIDefaultsContext = createContext<readonly UIDefaults[]>([])

export function UIProvider({
  size,
  appearance,
  components,
  children,
}: UIProviderProps) {
  const parent = useContext(UIDefaultsContext)
  return (
    <UIDefaultsContext.Provider
      value={[...parent, { size, appearance, components }]}
    >
      {children}
    </UIDefaultsContext.Provider>
  )
}

/** Variant keys supported by a `tv()` style function, e.g. `["sm","md","lg"]`. */
export function variantKeys(
  styles: { variants?: unknown },
  key: string
): readonly string[] {
  const variants = styles.variants as Record<string, object> | undefined
  const values = variants?.[key]
  return values ? Object.keys(values) : []
}

function pick(
  levels: readonly UIDefaults[],
  component: UIComponentName,
  key: UIStyleKey,
  supported: readonly string[]
): string | undefined {
  for (let i = levels.length - 1; i >= 0; i--) {
    const level = levels[i]
    const candidates = [level?.components?.[component]?.[key], level?.[key]]
    for (const value of candidates) {
      if (value !== undefined && supported.includes(value)) {
        return value
      }
    }
  }
  return undefined
}

type Supported<T extends UIStyleKey> = Partial<Record<T, readonly string[]>>

/** A `tv()` style function, or an explicit list of supported values per key. */
type UIStyleSource<T extends UIStyleKey> = { variants?: unknown } | Supported<T>

function supportedValues(
  source: UIStyleSource<UIStyleKey>,
  key: UIStyleKey
): readonly string[] | undefined {
  if ("variants" in source) {
    return variantKeys(source, key)
  }
  return (source as Supported<UIStyleKey>)[key]
}

/**
 * Resolve `size` / `appearance` for a component against the provider chain.
 * Pass the props as received (undefined when the caller did not set them) and
 * either the component's `tv()` styles (supported values are read from its
 * variants) or an explicit list per key. An explicit prop always wins.
 *
 * ```ts
 * const resolved = useUIDefaults("Button", { size, appearance }, buttonVariants)
 * const { size } = useUIDefaults("Select", { size }, { size: SELECT_SIZES })
 * ```
 */
export function useUIDefaults<
  P extends Partial<Record<UIStyleKey, string | undefined | null>>,
>(
  component: UIComponentName,
  props: P,
  source: UIStyleSource<Extract<keyof P, UIStyleKey>>
): P {
  const levels = useContext(UIDefaultsContext)
  if (levels.length === 0) {
    return props
  }
  const resolved: Record<string, unknown> = { ...props }
  for (const key of Object.keys(props) as UIStyleKey[]) {
    if (props[key] != null) {
      continue
    }
    const values = supportedValues(source, key)
    const value = values ? pick(levels, component, key, values) : undefined
    if (value !== undefined) {
      resolved[key] = value
    }
  }
  return resolved as P
}
