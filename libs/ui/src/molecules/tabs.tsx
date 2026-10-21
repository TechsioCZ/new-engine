/**
 * Tabs — @techsio/ui-kit molecule.
 *
 * @component Tabs
 * @componentVersion v1.2.1
 * @skill tabs-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tabs-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import * as tabs from "@zag-js/tabs"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type Ref,
  type RefObject,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button, type ButtonProps } from "../atoms/button"
import { tv } from "../utils"

const tabsVariants = tv({
  slots: {
    root: [
      "flex w-full min-w-0 max-w-full",
      "data-[orientation=horizontal]:flex-col",
      "data-[orientation=vertical]:flex-row",
      "bg-tabs-bg",
      "rounded-tabs",
    ],
    list: [
      "relative flex min-w-0 max-w-full",
      "bg-tabs-list-bg",
      "data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:overflow-x-auto",
      "data-[orientation=vertical]:w-max data-[orientation=vertical]:shrink-0 data-[orientation=vertical]:flex-col",
    ],
    trigger: [
      "relative flex shrink-0 items-center justify-center",
      "font-tabs-trigger text-tabs-trigger-fg-base data-selected:font-tabs-trigger-selected",
      "tabs-trigger-press",
      "rounded-tabs-trigger",
      "cursor-pointer",
      "not-data-disabled:hover:bg-tabs-trigger-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tabs-ring",
      "tabs-trigger-focus",
      "data-[selected]:text-tabs-trigger-fg-selected",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-tabs-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    indicator: [
      "absolute rounded-tabs-indicator bg-tabs-indicator-bg",
      "data-[orientation=vertical]:h-(--height) data-[orientation=horizontal]:w-(--width)",
      "data-[orientation=horizontal]:h-tabs-indicator-height data-[orientation=vertical]:w-tabs-indicator",
      "data-[orientation=vertical]:-start-tabs-rail-offset data-[orientation=horizontal]:bottom-0",
    ],
    content: [
      "wrap-anywhere min-w-0 max-w-full text-tabs-content-fg data-[orientation=vertical]:flex-1",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tabs-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
  },
  variants: {
    variant: {
      default: {
        trigger: "tabs-trigger-selected",
        indicator: "hidden",
      },
      line: {
        list: "data-[orientation=horizontal]:border-b-(length:--border-width-tabs) data-[orientation=vertical]:border-s-(length:--border-width-tabs) border-tabs-border-base",
        indicator: "",
      },
      solid: {
        trigger:
          "data-[selected]:bg-tabs-trigger-bg-selected data-[selected]:text-tabs-trigger-fg-solid-selected",
        indicator: "hidden",
      },
      outline: {
        trigger: [
          "border-(length:--border-width-tabs) border-transparent",
          "data-[selected]:border-tabs-border-selected",
          "data-[selected]:bg-tabs-trigger-bg-outline-selected",
        ],
        indicator: "hidden",
      },
    },
    size: {
      sm: {
        trigger: "h-form-control-sm p-tabs-trigger-sm text-tabs-trigger-sm",
        content: "p-tabs-content-padding-sm text-tabs-content-sm",
      },
      md: {
        trigger: "h-form-control-md p-tabs-trigger-md text-tabs-trigger-md",
        content: "p-tabs-content-padding-md text-tabs-content-md",
      },
      lg: {
        trigger: "h-form-control-lg p-tabs-trigger-lg text-tabs-trigger-lg",
        content: "p-tabs-content-padding-lg text-tabs-content-lg",
      },
    },
    fitted: {
      true: {
        list: "w-full",
        trigger: "flex-1",
      },
    },
    justify: {
      start: {
        list: "justify-start",
      },
      center: {
        list: "tabs-list-center",
      },
      end: {
        list: "tabs-list-end",
      },
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
    fitted: false,
    justify: "start",
  },
})

// Context for sharing state between sub-components
type TabsContextValue = {
  api: ReturnType<typeof tabs.connect>
  variant?: "default" | "line" | "solid" | "outline"
  size?: "sm" | "md" | "lg"
  fitted?: boolean
  justify?: "start" | "center" | "end"
  styles: ReturnType<typeof tabsVariants>
  /*
   * Values whose Tabs.Content is mounted. Zag points each trigger's
   * aria-controls at its panel, but a tab strip used as sub-navigation has no
   * panels; a trigger must not reference an id that does not exist.
   */
  contentValues: ReadonlySet<string>
  setContentValues: (
    update: (previous: ReadonlySet<string>) => ReadonlySet<string>
  ) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error("Tabs components must be used within Tabs")
  }
  return context
}

function enabledNeighbor(
  enabled: HTMLButtonElement[],
  previous: string[],
  value: string | null
) {
  const index = previous.indexOf(value ?? "")
  const neighbors = [
    ...previous.slice(Math.max(0, index + 1)),
    ...previous.slice(0, Math.max(0, index)).reverse(),
  ]
  return (
    neighbors
      .map((candidate) =>
        enabled.find((trigger) => trigger.dataset.value === candidate)
      )
      .find(Boolean) ?? enabled[0]
  )
}

function restoreOwnedTabFocus(
  root: HTMLElement,
  previous: HTMLElement | null,
  target?: HTMLElement
) {
  if (!previous) {
    return false
  }
  const unavailable =
    !previous.isConnected ||
    previous.matches(":disabled") ||
    Boolean(previous.closest('[data-part="content"][hidden]'))
  if (!unavailable) {
    return false
  }
  const active = root.ownerDocument.activeElement
  if (active === root.ownerDocument.body || root.contains(active)) {
    target?.focus()
  }
  return true
}

function tabEntry(
  root: HTMLElement,
  enabled: HTMLButtonElement[],
  focusedValue: string | null,
  target?: HTMLButtonElement
) {
  const focused = enabled.find(
    (trigger) => trigger.dataset.value === focusedValue
  )
  const ownsTriggerFocus = enabled.includes(
    root.ownerDocument.activeElement as HTMLButtonElement
  )
  return ownsTriggerFocus ? (focused ?? target) : (target ?? focused)
}

function reconcileTabSelection(
  api: TabsContextValue["api"],
  selected: HTMLButtonElement | undefined,
  target: HTMLButtonElement | undefined,
  controlled: boolean,
  request: RefObject<string | null>
) {
  if (selected) {
    request.current = null
    return
  }
  if (!target) {
    if (!controlled && api.value) {
      api.clearValue()
    }
    return
  }
  const next = target.dataset.value
  if (next == null) {
    return
  }
  const key = `${api.value ?? ""}:${next}`
  if (request.current === key) {
    return
  }
  request.current = key
  api.setValue(next)
}

function reconcileTabFocus(
  root: HTMLElement,
  triggers: HTMLButtonElement[],
  enabled: HTMLButtonElement[],
  previous: string[],
  api: TabsContextValue["api"],
  target: HTMLButtonElement | undefined,
  lastFocused: RefObject<HTMLElement | null>,
  setFocused: (value: string | null) => void
) {
  const focused = enabled.find(
    (trigger) => trigger.dataset.value === api.focusedValue
  )
  const replacement =
    focused ?? enabledNeighbor(enabled, previous, api.focusedValue) ?? target
  if (!focused && replacement) {
    setFocused(replacement.dataset.value ?? null)
  }
  const entryTarget = tabEntry(root, enabled, api.focusedValue, target)
  for (const trigger of triggers) {
    trigger.tabIndex = trigger === entryTarget ? 0 : -1
  }
  if (restoreOwnedTabFocus(root, lastFocused.current, replacement)) {
    lastFocused.current = null
  }
}

// Root component
export type TabsProps = VariantProps<typeof tabsVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    id?: string
    defaultValue?: string
    value?: string
    orientation?: "horizontal" | "vertical"
    dir?: "ltr" | "rtl"
    activationMode?: "automatic" | "manual"
    loopFocus?: boolean
    onValueChange?: (value: string) => void
    ref?: Ref<HTMLDivElement>
  }

export function Tabs({
  id,
  defaultValue,
  value,
  orientation = "horizontal",
  dir = "ltr",
  activationMode = "automatic",
  loopFocus = true,
  onValueChange,
  variant,
  size,
  fitted,
  justify,
  children,
  ref,
  className,
  ...props
}: TabsProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const rootElement = useRef<HTMLDivElement | null>(null)
  const previousValues = useRef<string[]>([])
  const lastFocused = useRef<HTMLElement | null>(null)
  const recoveryRequest = useRef<string | null>(null)

  const service = useMachine(tabs.machine, {
    id: uniqueId,
    value,
    defaultValue,
    orientation,
    dir,
    activationMode,
    loopFocus,
    onValueChange: ({ value: nextValue }) => {
      if (nextValue != null) {
        onValueChange?.(nextValue)
      }
    },
  })

  const api = tabs.connect(service, normalizeProps)
  const styles = tabsVariants({ variant, size, fitted, justify })
  const [contentValues, setContentValues] = useState<ReadonlySet<string>>(
    () => new Set()
  )

  // Observe the rendered collection, including compound consumers and async items.
  // A removed selection recovers to the next surviving neighbor, then previous.
  useEffect(() => {
    const root = rootElement.current
    if (!root) {
      return
    }
    const reconcile = () => {
      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>(
          '[data-scope="tabs"][data-part="trigger"]'
        )
      ).filter(
        (trigger) =>
          trigger.closest('[data-scope="tabs"][data-part="root"]') === root
      )
      const enabled = triggers.filter((trigger) => !trigger.disabled)
      const values = triggers.map((trigger) => trigger.dataset.value ?? "")
      const selected = enabled.find(
        (trigger) => trigger.dataset.value === api.value
      )
      const fallback = enabledNeighbor(
        enabled,
        previousValues.current,
        api.value
      )
      const target = selected ?? fallback
      reconcileTabSelection(
        api,
        selected,
        target,
        value !== undefined,
        recoveryRequest
      )
      // Controlled owners may reject recovery. Never remove keyboard entry.
      reconcileTabFocus(
        root,
        triggers,
        enabled,
        previousValues.current,
        api,
        target,
        lastFocused,
        (next) => service.context.set("focusedValue", next)
      )
      // Keep the pre-removal order until the proposed replacement commits.
      // MutationObserver may run again before Zag flushes setValue.
      if (selected || api.value == null) {
        previousValues.current = values
      }
    }
    reconcile()
    const observer = new MutationObserver(reconcile)
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "hidden"],
    })
    return () => observer.disconnect()
  })

  return (
    <TabsContext.Provider
      value={{
        api,
        variant,
        size,
        fitted,
        justify,
        styles,
        contentValues,
        setContentValues,
      }}
    >
      <div
        className={styles.root({ className })}
        {...mergeProps(props, api.getRootProps())}
        onBlurCapture={(event) => {
          props.onBlurCapture?.(event)
          if (
            event.relatedTarget &&
            !event.currentTarget.contains(event.relatedTarget as Node)
          ) {
            lastFocused.current = null
          }
        }}
        onFocusCapture={(event) => {
          props.onFocusCapture?.(event)
          lastFocused.current = event.target as HTMLElement
        }}
        ref={(node) => {
          rootElement.current = node
          if (typeof ref === "function") {
            return ref(node)
          }
          if (ref) {
            ref.current = node
          }
        }}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

// List component
type TabsListProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Tabs.List = function TabsList({
  children,
  ref,
  className,
  ...props
}: TabsListProps) {
  const { api, styles } = useTabsContext()

  return (
    <div
      className={styles.list({ className })}
      ref={ref}
      {...mergeProps(api.getListProps(), props)}
      role="tablist"
    >
      {children}
    </div>
  )
}

// Trigger component
type TabsTriggerProps = Omit<ButtonProps, "value"> & {
  value: string
  ref?: Ref<HTMLButtonElement>
}

Tabs.Trigger = function TabsTrigger({
  value,
  disabled,
  children,
  ref,
  className,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: TabsTriggerProps) {
  const { api, contentValues, styles } = useTabsContext()
  const triggerProps = mergeProps(
    api.getTriggerProps({ value, disabled }),
    props
  )

  const triggerElement = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    const trigger = triggerElement.current
    const list = trigger?.closest<HTMLElement>('[data-part="list"]')
    if (
      !(trigger && list) ||
      (api.value !== value && api.focusedValue !== value)
    ) {
      return
    }
    const row = trigger.getBoundingClientRect()
    const viewport = list.getBoundingClientRect()
    // Scroll only the strip, never the page or surrounding panel.
    if (row.left < viewport.left) {
      list.scrollLeft += row.left - viewport.left
    } else if (row.right > viewport.right) {
      list.scrollLeft += row.right - viewport.right
    }
  }, [api.value, api.focusedValue, value])

  return (
    <Button
      {...triggerProps}
      aria-controls={
        contentValues.has(value) ? triggerProps["aria-controls"] : undefined
      }
      className={styles.trigger({ className })}
      composition={true}
      data-disabled={disabled ? "" : undefined}
      ref={(node) => {
        triggerElement.current = node
        if (typeof ref === "function") {
          return ref(node)
        }
        if (ref) {
          ref.current = node
        }
      }}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

// Content component
type TabsContentProps = ComponentPropsWithoutRef<"div"> & {
  value: string
  ref?: Ref<HTMLDivElement>
}

Tabs.Content = function TabsContent({
  value,
  children,
  ref,
  className,
  ...props
}: TabsContentProps) {
  const { api, setContentValues, styles } = useTabsContext()
  useEffect(() => {
    setContentValues((previous) => new Set(previous).add(value))
    return () =>
      setContentValues((previous) => {
        const next = new Set(previous)
        next.delete(value)
        return next
      })
  }, [value, setContentValues])

  return (
    <div
      className={styles.content({ className })}
      ref={ref}
      {...api.getContentProps({ value })}
      {...props}
    >
      {children}
    </div>
  )
}

// Indicator component
type TabsIndicatorProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Tabs.Indicator = function TabsIndicator({
  ref,
  className,
  ...props
}: TabsIndicatorProps) {
  const { api, styles } = useTabsContext()

  return (
    <div
      className={styles.indicator({ className })}
      ref={ref}
      {...api.getIndicatorProps()}
      {...props}
    />
  )
}

// Display name
Tabs.displayName = "Tabs"
