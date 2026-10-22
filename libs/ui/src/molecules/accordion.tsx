/**
 * Accordion — @techsio/ui-kit molecule.
 *
 * @component Accordion
 * @componentVersion v1.2.1
 * @skill accordion-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the accordion-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as accordion from "@zag-js/accordion"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type Ref,
  useContext,
  useId,
  useMemo,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Icon, type IconProps, type IconType } from "../atoms/icon"
import { tv } from "../utils"

const accordionVariants = tv({
  slots: {
    root: [
      "flex w-full min-w-0 max-w-full flex-col",
      "rounded-accordion bg-accordion-bg",
      "transition duration-200 motion-reduce:transition-none",
    ],
    item: "min-w-0 max-w-full",
    heading: "min-w-0 max-w-full",
    indicator: "shrink-0",
    title: "wrap-anywhere grid min-w-0 max-w-full place-items-start text-start",
    titleTrigger: [
      "wrap-anywhere relative flex w-full min-w-0 max-w-full cursor-pointer items-center justify-between",
      "rounded-none",
      "gap-accordion-trigger font-accordion-trigger",
      "bg-accordion-title-bg text-accordion-title-fg",
      "not-data-disabled:hover:bg-accordion-title-bg-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
      "focus-visible:accordion-focus-outline",
      "data-disabled:cursor-not-allowed data-disabled:text-accordion-trigger-fg-disabled",
    ],
    subtitle: ["font-accordion-panel text-accordion-subtitle-fg"],
    content: [
      "bg-accordion-content-bg font-accordion-panel text-accordion-panel-fg",
      "border-t-(length:--border-width-accordion) border-accordion-panel-border",
      "leading-accordion-panel",
    ],
    icon: [
      "shrink-0 transition-transform data-[state=expanded]:rotate-180 motion-reduce:transition-none",
    ],
  },
  variants: {
    variant: {
      default: {
        root: "border-(length:--border-width-accordion) border-accordion-border",
        item: "border-b-(length:--border-width-accordion) border-accordion-border last:border-b-0",
      },
      borderless: {},
      child: {},
    },
    shadow: {
      sm: {
        root: "shadow-accordion-root-sm",
        content: "shadow-accordion-content-sm",
      },
      md: {
        root: "shadow-accordion-root-md",
        content: "shadow-accordion-content-md",
      },
      none: "",
    },
    size: {
      sm: {
        titleTrigger: "p-accordion-title-sm text-accordion-title-sm",
        content: "p-accordion-panel-sm text-accordion-panel-sm",
        subtitle: "text-accordion-subtitle-sm",
        icon: "text-icon-control-sm",
      },
      md: {
        titleTrigger: "p-accordion-title-md text-accordion-title-md",
        content: "p-accordion-panel-md text-accordion-panel-md",
        subtitle: "text-accordion-subtitle-md",
        icon: "text-icon-control-md",
      },
      lg: {
        titleTrigger: "p-accordion-title-lg text-accordion-title-lg",
        content: "p-accordion-panel-lg text-accordion-panel-lg",
        subtitle: "text-accordion-subtitle-lg",
        icon: "text-icon-control-lg",
      },
    },
  },
  compoundVariants: [
    {
      variant: "child",
      size: ["sm", "md", "lg"],
      className: {
        content: "bg-inherit",
      },
    },
  ],
  defaultVariants: {
    size: "md",
    shadow: "none",
    variant: "default",
  },
})

// Context for sharing state between sub-components
type AccordionContextValue = {
  api: ReturnType<typeof accordion.connect>
  size?: "sm" | "md" | "lg"
  shadow?: "sm" | "md" | "none"
  styles: ReturnType<typeof accordionVariants>
  variant?: "default" | "borderless" | "child"
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

function useAccordionContext() {
  const context = useContext(AccordionContext)
  if (!context) {
    throw new Error("Accordion components must be used within Accordion.Root")
  }
  return context
}

// Context for sharing item state
type AccordionItemContextValue = {
  value: string
  disabled?: boolean
  variant?: "default" | "borderless" | "child"
}

const AccordionItemContext = createContext<AccordionItemContextValue | null>(
  null
)

function useAccordionItemContext() {
  const context = useContext(AccordionItemContext)
  if (!context) {
    throw new Error(
      "Accordion item components must be used within Accordion.Item"
    )
  }
  return context
}

// Root component
export type AccordionProps = VariantProps<typeof accordionVariants> &
  Omit<ComponentPropsWithoutRef<"div">, "onChange"> & {
    id?: string
    defaultValue?: string[]
    value?: string[]
    collapsible?: boolean
    multiple?: boolean
    disabled?: boolean
    dir?: "ltr" | "rtl"
    onChange?: (value: string[]) => void
    ref?: Ref<HTMLDivElement>
  }

export function Accordion({
  id,
  defaultValue,
  value,
  collapsible = true,
  multiple = false,
  dir = "ltr",
  onChange,
  size,
  shadow,
  disabled = false,
  children,
  ref,
  className,
  variant,
  ...props
}: AccordionProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const service = useMachine(accordion.machine, {
    id: uniqueId,
    value,
    defaultValue,
    collapsible,
    multiple,
    dir,
    orientation: "vertical",
    disabled,
    onValueChange: ({ value: newValue }) => {
      onChange?.(newValue)
    },
  })

  const api = accordion.connect(service, normalizeProps)
  const styles = accordionVariants({ size, shadow, variant })

  return (
    <AccordionContext.Provider value={{ api, size, shadow, styles, variant }}>
      <div
        className={styles.root({ className })}
        ref={ref}
        {...props}
        {...api.getRootProps()}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

// Item component
type AccordionItemProps = ComponentPropsWithoutRef<"div"> & {
  value: string
  disabled?: boolean
  ref?: Ref<HTMLDivElement>
}

Accordion.Item = function AccordionItem({
  value,
  disabled,
  children,
  ref,
  className,
  ...props
}: AccordionItemProps) {
  const { api, styles, variant } = useAccordionContext()

  return (
    <AccordionItemContext.Provider value={{ value, disabled, variant }}>
      <div
        ref={ref}
        {...props}
        {...api.getItemProps({ value, disabled })}
        className={styles.item({ className })}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

// Header component (heading wrapper for the trigger)
type AccordionHeaderProps = ComponentPropsWithoutRef<"h3"> & {
  ref?: Ref<HTMLElement>
}

// APG accordion: each trigger sits in a heading. A bare <header> would be a
// banner landmark, one per item. Pass aria-level to fit the page outline.
Accordion.Header = function AccordionHeader({
  children,
  ref,
  className,
  ...props
}: AccordionHeaderProps) {
  const { api, styles } = useAccordionContext()
  const { value, disabled } = useAccordionItemContext()
  const headingRef = useMemo(() => {
    if (typeof ref === "function" || !ref) {
      return ref
    }
    return (node: HTMLHeadingElement | null) => {
      ref.current = node
    }
  }, [ref])

  return (
    <h3 className={styles.heading({ className })} ref={headingRef} {...props}>
      <button
        className={styles.titleTrigger()}
        type="button"
        {...api.getItemTriggerProps({ value, disabled })}
        data-disabled={
          api.getItemState({ value, disabled }).disabled || undefined
        }
      >
        {children}
      </button>
    </h3>
  )
}

// Content component
type AccordionContentProps = ComponentPropsWithoutRef<"div"> & {
  ref?: Ref<HTMLDivElement>
}

Accordion.Content = function AccordionContent({
  children,
  ref,
  className,
  ...props
}: AccordionContentProps) {
  const { api, styles } = useAccordionContext()
  const { value } = useAccordionItemContext()
  const contentProps = api.getItemContentProps({ value })

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: Zag supplies a region; consumers can choose another named grouping role.
    <div
      className={styles.content({ className })}
      ref={ref}
      {...props}
      {...contentProps}
      aria-labelledby={
        props["aria-labelledby"] ??
        (props["aria-label"] ? undefined : contentProps["aria-labelledby"])
      }
      data-state={api.value.includes(value) ? "expanded" : "collapsed"}
      role={props.role ?? contentProps.role}
    >
      {children}
    </div>
  )
}

// Indicator component (for expand/collapse icon)
type AccordionIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  icon?: IconType
  iconSize?: IconProps["size"]
  ref?: Ref<HTMLSpanElement>
}

Accordion.Indicator = function AccordionIndicator({
  icon = "token-icon-accordion-chevron",
  iconSize,
  ref,
  className,
  ...props
}: AccordionIndicatorProps) {
  const { api, styles } = useAccordionContext()
  const { value } = useAccordionItemContext()

  const isExpanded = api.value.includes(value)

  return (
    <span className={styles.indicator({ className })} ref={ref} {...props}>
      <Icon
        className={styles.icon()}
        data-state={isExpanded ? "expanded" : "collapsed"}
        icon={icon}
        size={iconSize}
      />
    </span>
  )
}

// Title component (optional structured title)
type AccordionTitleProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Accordion.Title = function AccordionTitle({
  children,
  ref,
  className,
  ...props
}: AccordionTitleProps) {
  const { styles } = useAccordionContext()

  return (
    <span className={styles.title({ className })} ref={ref} {...props}>
      {children}
    </span>
  )
}

// Subtitle component (optional structured subtitle)
type AccordionSubtitleProps = ComponentPropsWithoutRef<"span"> & {
  ref?: Ref<HTMLSpanElement>
}

Accordion.Subtitle = function AccordionSubtitle({
  children,
  ref,
  className,
  ...props
}: AccordionSubtitleProps) {
  const { styles } = useAccordionContext()

  return (
    <span className={styles.subtitle({ className })} ref={ref} {...props}>
      {children}
    </span>
  )
}
