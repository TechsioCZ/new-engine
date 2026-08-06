/*
 * Tabs — @techsio/ui-kit molecule.
 *
 * @component Tabs
 * @componentVersion v1.0.2
 * @skill tabs-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the tabs-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { connect as connectTabs, machine as tabsMachine } from "@zag-js/tabs"
import type { Api as TabsApi } from "@zag-js/tabs"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import type { ButtonProps } from "../atoms/button"
import { tv } from "../utils"

const tabsVariants = tv({
  defaultVariants: {
    fitted: false,
    justify: "start",
    size: "md",
    variant: "default",
  },
  slots: {
    content: [
      "text-tabs-content-fg",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tabs-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
    ],
    indicator: [
      "absolute rounded-tabs-indicator bg-tabs-indicator-bg",
      "data-[orientation=vertical]:h-(--height) data-[orientation=horizontal]:w-(--width)",
      "data-[orientation=horizontal]:h-tabs-indicator-height data-[orientation=vertical]:w-tabs-indicator",
      "data-[orientation=vertical]:start-0 data-[orientation=horizontal]:bottom-0",
    ],
    list: [
      "relative flex",
      "bg-tabs-list-bg",
      "data-[orientation=horizontal]:flex-row",
      "data-[orientation=vertical]:flex-col",
    ],
    root: [
      "flex w-full",
      "data-[orientation=horizontal]:flex-col",
      "data-[orientation=vertical]:flex-row",
      "bg-tabs-bg",
      "rounded-tabs",
    ],
    trigger: [
      "relative flex items-center justify-center",
      "text-tabs-trigger-fg-base",
      "rounded-tabs-trigger",
      "cursor-pointer",
      "hover:bg-tabs-trigger-bg-hover",
      "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
      "focus-visible:outline-tabs-ring",
      "focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-[selected]:text-tabs-trigger-fg-selected",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-tabs-trigger-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
  },
  variants: {
    fitted: {
      true: {
        list: "w-full",
        trigger: "flex-1",
      },
    },
    justify: {
      center: {
        list: "justify-center",
      },
      end: {
        list: "justify-end",
      },
      start: {
        list: "justify-start",
      },
    },
    size: {
      lg: {
        content: "p-tabs-content-padding-lg text-tabs-content-lg",
        trigger: "p-tabs-trigger-lg text-tabs-trigger-lg",
      },
      md: {
        content: "p-tabs-content-padding-md text-tabs-content-md",
        trigger: "p-tabs-trigger-md text-tabs-trigger-md",
      },
      sm: {
        content: "p-tabs-content-padding-sm text-tabs-content-sm",
        trigger: "p-tabs-trigger-sm text-tabs-trigger-sm",
      },
    },
    variant: {
      default: {
        indicator: "hidden",
        list: "",
      },
      line: {
        indicator:
          "data-[orientation=horizontal]:-bottom-(--border-width-tabs)",
        list: "border-b-(length:--border-width-tabs) border-tabs-border-base",
      },
      outline: {
        indicator: "hidden",
        trigger: [
          "border-(length:--border-width-tabs) border-transparent",
          "data-[selected]:border-tabs-border-selected",
          "data-[selected]:bg-tabs-trigger-bg-outline-selected",
        ],
      },
      solid: {
        indicator: "hidden",
        trigger:
          "data-[selected]:bg-tabs-trigger-bg-selected data-[selected]:text-tabs-trigger-fg-solid-selected",
      },
    },
  },
})

// Context for sharing state between sub-components
const TabsApiContext = createContext<TabsApi | null>(null)
const TabsStylesContext = createContext<ReturnType<typeof tabsVariants> | null>(
  null,
)

const useTabsContext = () => {
  const api = useContext(TabsApiContext)
  const styles = useContext(TabsStylesContext)

  if (api === null || styles === null) {
    throw new Error("Tabs components must be used within Tabs")
  }

  return { api, styles }
}

// Root component
export interface TabsProps
  extends
    VariantProps<typeof tabsVariants>,
    Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  id?: string | undefined
  defaultValue?: string | undefined
  value?: string | undefined
  orientation?: "horizontal" | "vertical" | undefined
  dir?: "ltr" | "rtl" | undefined
  activationMode?: "automatic" | "manual" | undefined
  loopFocus?: boolean | undefined
  onValueChange?: ((value: string) => void) | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

const TabsRoot = ({
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
}: TabsProps) => {
  const generatedId = useId()
  const uniqueId = id ?? generatedId

  const service = useMachine(tabsMachine, {
    activationMode,
    defaultValue,
    dir,
    id: uniqueId,
    loopFocus,
    onValueChange: ({ value: nextValue }) => {
      onValueChange?.(nextValue)
    },
    orientation,
    value,
  })

  const api = connectTabs(service, normalizeProps)
  const styles = tabsVariants({ fitted, justify, size, variant })
  const rootProps = mergeProps(api.getRootProps(), props)

  return (
    <TabsApiContext.Provider value={api}>
      <TabsStylesContext.Provider value={styles}>
        <div {...rootProps} className={styles.root({ className })} ref={ref}>
          {children}
        </div>
      </TabsStylesContext.Provider>
    </TabsApiContext.Provider>
  )
}

// List component
interface TabsListProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

const TabsList = ({ children, ref, className, ...props }: TabsListProps) => {
  const { api, styles } = useTabsContext()
  const listProps = mergeProps(api.getListProps(), props)

  return (
    <div {...listProps} className={styles.list({ className })} ref={ref}>
      {children}
    </div>
  )
}

// Trigger component
type TabsTriggerProps = Omit<ButtonProps, "value"> & {
  value: string
  ref?: Ref<HTMLButtonElement> | undefined
}

const TabsTrigger = ({
  value,
  disabled,
  children,
  ref,
  className,
  size = "current",
  theme = "unstyled",
  type = "button",
  ...props
}: TabsTriggerProps) => {
  const { api, styles } = useTabsContext()
  const triggerProps = mergeProps(
    api.getTriggerProps({ disabled, value }),
    props,
  )

  return (
    <Button
      {...triggerProps}
      className={styles.trigger({ className })}
      data-disabled={disabled === true ? true : undefined}
      ref={ref}
      size={size}
      theme={theme}
      type={type}
    >
      {children}
    </Button>
  )
}

// Content component
interface TabsContentProps extends ComponentPropsWithoutRef<"div"> {
  value: string
  ref?: Ref<HTMLDivElement> | undefined
}

const TabsContent = ({
  value,
  children,
  ref,
  className,
  ...props
}: TabsContentProps) => {
  const { api, styles } = useTabsContext()
  const contentProps = mergeProps(api.getContentProps({ value }), props)

  return (
    <div {...contentProps} className={styles.content({ className })} ref={ref}>
      {children}
    </div>
  )
}

// Indicator component
interface TabsIndicatorProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

const TabsIndicator = ({ ref, className, ...props }: TabsIndicatorProps) => {
  const { api, styles } = useTabsContext()
  const indicatorProps = mergeProps(api.getIndicatorProps(), props)

  return (
    <div
      {...indicatorProps}
      className={styles.indicator({ className })}
      ref={ref}
    />
  )
}

// Display name
TabsRoot.displayName = "Tabs"

const TabsCompound = Object.assign(TabsRoot, {
  Content: TabsContent,
  Indicator: TabsIndicator,
  List: TabsList,
  Trigger: TabsTrigger,
})

export const Tabs = TabsCompound
