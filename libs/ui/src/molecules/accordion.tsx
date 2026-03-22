import * as accordion from "@zag-js/accordion"
import { normalizeProps, useMachine } from "@zag-js/react"
import {
  type ComponentPropsWithoutRef,
  createContext,
  type Ref,
  useContext,
  useId,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { tv } from "../utils"

const accordionVariants = tv({
  slots: {
    root: [
      "flex w-full flex-col",
      "rounded-accordion bg-accordion-bg",
      "transition-all duration-200",
      "transition-all duration-200 motion-reduce:transition-none",
    ],
    item: "",
    title: "grid place-items-start",
    titleTrigger: [
      "relative flex w-full cursor-pointer items-center justify-between",
      "rounded-none",
      "font-accordion-title",
      "bg-accordion-title-bg text-accordion-title-fg",
      "hover:bg-accordion-title-bg-hover",
      "pr-accordion-icon",
      "data-[disabled=true]:cursor-not-allowed",
    ],
    subtitle: ["text-accordion-subtitle-fg"],
    content: ["bg-accordion-content-bg text-accordion-content-fg"],
    icon: ["data-[state=expanded]:rotate-180"],
  },
  variants: {
    variant: {
      default: {
        root: "border-(length:--border-width-accordion) border-accordion-border",
        item: "border-b-(length:--border-width-accordion) border-accordion-border",
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
        title: "p-accordion-title-sm text-accordion-title-sm",
        content: "px-accordion-content-sm text-accordion-content-sm",
        subtitle: "text-accordion-subtitle-sm",
      },
      md: {
        title: "p-accordion-title-md text-accordion-title-md",
        content: "p-accordion-content-md text-accordion-content-md",
        subtitle: "text-accordion-subtitle-md",
      },
      lg: {
        title: "p-accordion-title-lg text-accordion-title-lg",
        content: "p-accordion-content-lg text-accordion-content-lg",
        subtitle: "text-accordion-subtitle-lg",
      },
    },
  },
  compoundVariants: [
    {
      variant: "child",
      size: ["sm", "md", "lg"],
      className: {
        content: "bg-inherit py-0 text-inherit",
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
interface AccordionContextValue {
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
interface AccordionItemContextValue {
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
export interface AccordionProps
  extends VariantProps<typeof accordionVariants>,
    Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
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
interface AccordionItemProps extends ComponentPropsWithoutRef<"div"> {
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
        {...api.getItemProps({ value })}
        className={styles.item({ className })}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

// Header component (trigger wrapper)
interface AccordionHeaderProps extends ComponentPropsWithoutRef<"header"> {
  ref?: Ref<HTMLElement>
}

Accordion.Header = function AccordionHeader({
  children,
  ref,
  className,
  ...props
}: AccordionHeaderProps) {
  const { api, styles } = useAccordionContext()
  const { value, disabled } = useAccordionItemContext()

  return (
    <header className={className} ref={ref} {...props}>
      <Button
        className={styles.titleTrigger()}
        size="current"
        theme="unstyled"
        type="button"
        {...api.getItemTriggerProps({ value, disabled })}
        data-disabled={disabled}
      >
        {children}
      </Button>
    </header>
  )
}

// Content component
interface AccordionContentProps extends ComponentPropsWithoutRef<"div"> {
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

  return (
    <div
      className={styles.content({ className })}
      ref={ref}
      {...props}
      {...api.getItemContentProps({ value })}
      data-state={api.value.includes(value) ? "expanded" : "collapsed"}
    >
      {children}
    </div>
  )
}

// Indicator component (for expand/collapse icon)
interface AccordionIndicatorProps extends ComponentPropsWithoutRef<"span"> {
  icon?: IconType
  ref?: Ref<HTMLSpanElement>
}

Accordion.Indicator = function AccordionIndicator({
  icon = "token-icon-accordion-chevron",
  ref,
  className,
  ...props
}: AccordionIndicatorProps) {
  const { api, styles } = useAccordionContext()
  const { value } = useAccordionItemContext()

  const isExpanded = api.value.includes(value)

  return (
    <span className={className} ref={ref} {...props}>
      <Icon
        className={styles.icon()}
        data-state={isExpanded ? "expanded" : "collapsed"}
        icon={icon}
      />
    </span>
  )
}

// Title component (optional structured title)
interface AccordionTitleProps extends ComponentPropsWithoutRef<"span"> {
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
interface AccordionSubtitleProps extends ComponentPropsWithoutRef<"span"> {
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
