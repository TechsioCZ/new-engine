/*
 * Accordion — @techsio/ui-kit molecule.
 *
 * @component Accordion
 * @componentVersion v1.0.1
 * @skill accordion-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the accordion-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/accordion"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import { createContext, useContext, useId } from "react"
import type { ComponentPropsWithoutRef, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import type { IconProps, IconType } from "../atoms/icon"
import { tv } from "../utils"

const accordionVariants = tv({
  compoundVariants: [
    {
      className: {
        content: "bg-inherit py-0 text-inherit",
      },
      size: ["sm", "md", "lg"],
      variant: "child",
    },
  ],
  defaultVariants: {
    shadow: "none",
    size: "md",
    variant: "default",
  },
  slots: {
    content: ["bg-accordion-content-bg text-accordion-content-fg"],
    icon: ["data-[state=expanded]:rotate-180"],
    item: "",
    root: [
      "flex w-full flex-col",
      "rounded-accordion bg-accordion-bg",
      "transition-all duration-200",
      "transition-all duration-200 motion-reduce:transition-none",
    ],
    subtitle: ["text-accordion-subtitle-fg"],
    title: "grid place-items-start",
    titleTrigger: [
      "relative flex w-full cursor-pointer items-center justify-between",
      "rounded-none",
      "font-accordion-title",
      "bg-accordion-title-bg text-accordion-title-fg",
      "hover:bg-accordion-title-bg-hover",
      "pr-accordion-icon-right",
      "data-[disabled=true]:cursor-not-allowed",
    ],
  },
  variants: {
    shadow: {
      md: {
        content: "shadow-accordion-content-md",
        root: "shadow-accordion-root-md",
      },
      none: "",
      sm: {
        content: "shadow-accordion-content-sm",
        root: "shadow-accordion-root-sm",
      },
    },
    size: {
      lg: {
        content: "p-accordion-content-lg text-accordion-content-lg",
        icon: "text-icon-control-lg",
        subtitle: "text-accordion-subtitle-lg",
        title: "p-accordion-title-lg text-accordion-title-lg",
      },
      md: {
        content: "p-accordion-content-md text-accordion-content-md",
        icon: "text-icon-control-md",
        subtitle: "text-accordion-subtitle-md",
        title: "p-accordion-title-md text-accordion-title-md",
      },
      sm: {
        content: "px-accordion-content-x-sm text-accordion-content-sm",
        icon: "text-icon-control-sm",
        subtitle: "text-accordion-subtitle-sm",
        title: "p-accordion-title-sm text-accordion-title-sm",
      },
    },
    variant: {
      borderless: {},
      child: {},
      default: {
        item: "border-b-(length:--border-width-accordion) border-accordion-border",
        root: "border-(length:--border-width-accordion) border-accordion-border",
      },
    },
  },
})

type AccordionVariants = VariantProps<typeof accordionVariants>
type AccordionVariant = NonNullable<AccordionVariants["variant"]>

// Context for sharing state between sub-components
const AccordionApiContext = createContext<ReturnType<typeof connect> | null>(
  null,
)
const AccordionStylesContext = createContext<ReturnType<
  typeof accordionVariants
> | null>(null)
const AccordionVariantContext = createContext<AccordionVariant | undefined>(
  undefined,
)

const useAccordionContext = () => {
  const api = useContext(AccordionApiContext)
  const styles = useContext(AccordionStylesContext)
  const variant = useContext(AccordionVariantContext)
  if (api === null || styles === null) {
    throw new Error("Accordion components must be used within Accordion.Root")
  }
  return { api, styles, variant }
}

// Context for sharing item state
const AccordionItemValueContext = createContext<string | null>(null)
const AccordionItemDisabledContext = createContext<boolean | undefined>(
  undefined,
)

const useAccordionItemContext = () => {
  const value = useContext(AccordionItemValueContext)
  const disabled = useContext(AccordionItemDisabledContext)
  if (value === null) {
    throw new Error(
      "Accordion item components must be used within Accordion.Item",
    )
  }
  return { disabled, value }
}

// Root component
export interface AccordionProps
  extends
    VariantProps<typeof accordionVariants>,
    Omit<ComponentPropsWithoutRef<"div">, "onChange"> {
  id?: string | undefined
  defaultValue?: string[] | undefined
  value?: string[] | undefined
  collapsible?: boolean | undefined
  multiple?: boolean | undefined
  disabled?: boolean | undefined
  dir?: "ltr" | "rtl" | undefined
  onChange?: ((value: string[]) => void) | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

export const Accordion = ({
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
}: AccordionProps) => {
  const generatedId = useId()
  const uniqueId = id ?? generatedId

  const service = useMachine(machine, {
    collapsible,
    defaultValue,
    dir,
    disabled,
    id: uniqueId,
    multiple,
    onValueChange: ({ value: newValue }) => {
      onChange?.(newValue)
    },
    orientation: "vertical",
    value,
  })

  const api = connect(service, normalizeProps)
  const styles = accordionVariants({ shadow, size, variant })
  return (
    <AccordionApiContext.Provider value={api}>
      <AccordionStylesContext.Provider value={styles}>
        <AccordionVariantContext.Provider value={variant}>
          <div
            {...mergeProps(api.getRootProps(), props)}
            className={styles.root({ className })}
            ref={ref}
          >
            {children}
          </div>
        </AccordionVariantContext.Provider>
      </AccordionStylesContext.Provider>
    </AccordionApiContext.Provider>
  )
}

// Item component
interface AccordionItemProps extends ComponentPropsWithoutRef<"div"> {
  value: string
  disabled?: boolean | undefined
  ref?: Ref<HTMLDivElement> | undefined
}

Accordion.Item = function Item({
  value,
  disabled,
  children,
  ref,
  className,
  ...props
}: AccordionItemProps) {
  const { api, styles } = useAccordionContext()

  return (
    <AccordionItemValueContext.Provider value={value}>
      <AccordionItemDisabledContext.Provider value={disabled}>
        <div
          {...mergeProps(api.getItemProps({ value }), props)}
          className={styles.item({ className })}
          ref={ref}
        >
          {children}
        </div>
      </AccordionItemDisabledContext.Provider>
    </AccordionItemValueContext.Provider>
  )
}

// Header component (trigger wrapper)
interface AccordionHeaderProps extends ComponentPropsWithoutRef<"header"> {
  ref?: Ref<HTMLElement> | undefined
}

Accordion.Header = function Header({
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
        {...api.getItemTriggerProps({ disabled, value })}
        className={styles.titleTrigger()}
        data-disabled={disabled}
        size="current"
        theme="unstyled"
        type="button"
      >
        {children}
      </Button>
    </header>
  )
}

// Content component
interface AccordionContentProps extends ComponentPropsWithoutRef<"div"> {
  ref?: Ref<HTMLDivElement> | undefined
}

Accordion.Content = function Content({
  children,
  ref,
  className,
  ...props
}: AccordionContentProps) {
  const { api, styles } = useAccordionContext()
  const { value } = useAccordionItemContext()

  return (
    <div
      {...mergeProps(api.getItemContentProps({ value }), props)}
      className={styles.content({ className })}
      data-state={api.value.includes(value) ? "expanded" : "collapsed"}
      ref={ref}
    >
      {children}
    </div>
  )
}

// Indicator component (for expand/collapse icon)
type AccordionIndicatorProps = ComponentPropsWithoutRef<"span"> & {
  icon?: IconType | undefined
  iconSize?: IconProps["size"] | undefined
  ref?: Ref<HTMLSpanElement> | undefined
}

Accordion.Indicator = function Indicator({
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
    <span className={className} ref={ref} {...props}>
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
interface AccordionTitleProps extends ComponentPropsWithoutRef<"span"> {
  ref?: Ref<HTMLSpanElement> | undefined
}

Accordion.Title = function Title({
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
  ref?: Ref<HTMLSpanElement> | undefined
}

Accordion.Subtitle = function Subtitle({
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
