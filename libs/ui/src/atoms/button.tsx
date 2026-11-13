/**
 * Button — @techsio/ui-kit atom.
 *
 * @component Button
 * @componentVersion v1.0.0
 * @skill button-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the button-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type ButtonHTMLAttributes,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { useUIDefaults } from "../theme/ui-provider"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

export const buttonVariants = tv({
  base: [
    "button-disabled relative",
    "inline-flex cursor-pointer items-center justify-center",
    "transition duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-button-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:text-button-fg-disabled",
    "not-disabled:data-loading:cursor-progress",
  ],
  variants: {
    // Internal composition escape hatch: navigation owns its typography/press treatment.
    // Unlike `unstyled`, this deliberately omits Button-only visuals.
    composition: {
      true: "",
      false: [
        "font-button",
        "motion-safe:not-disabled:not-data-disabled:not-data-loading:active:scale-97",
      ],
    },
    // Density selects the fixed compact geometry; default keeps content-driven sizing.
    density: {
      default: "",
      compact: "",
    },
    severity: {
      primary: "",
      secondary: "",
      tertiary: "",
      danger: "",
      warning: "",
    },
    // `unstyled` is internal: the public boolean `unstyled` prop selects it.
    appearance: {
      solid: "disabled:bg-button-bg-disabled",
      subtle: "disabled:bg-button-bg-disabled",
      ghost:
        "button-disabled-borderless bg-button-bg-borderless-base hover:bg-button-bg-borderless-hover hover:text-button-fg-interacting active:bg-button-bg-borderless-active active:text-button-fg-interacting",
      outline: "button-disabled-outlined border bg-button-bg-outlined",
      unstyled: "",
    },
    uppercase: {
      true: "uppercase",
    },
    size: {
      sm: "min-w-0 gap-button-sm rounded-button-sm text-button-sm",
      md: "min-w-0 gap-button-md rounded-button-md text-button-md",
      lg: "min-w-0 gap-button-lg rounded-button-lg text-button-lg",
      current: "button-current-size gap-button-md",
    },
    block: {
      true: "w-full",
    },
  },
  compoundVariants: [
    // Geometry lives in density compounds so compact never inherits the
    // content-driven min-height of button-size-*.
    { density: "default", size: "sm", className: "button-size-sm p-button-sm" },
    { density: "default", size: "md", className: "button-size-md p-button-md" },
    { density: "default", size: "lg", className: "button-size-lg p-button-lg" },
    {
      density: "compact",
      size: "sm",
      className: "h-button-compact-sm p-button-compact-sm",
    },
    {
      density: "compact",
      size: "md",
      className: "h-button-compact-md p-button-compact-md",
    },
    {
      density: "compact",
      size: "lg",
      className: "h-button-compact-lg p-button-compact-lg",
    },
    {
      severity: "primary",
      appearance: "solid",
      className: [
        "bg-button-bg-primary-base",
        "hover:bg-button-bg-primary-hover",
        "active:bg-button-bg-primary-active",
        "text-button-fg-primary",
      ],
    },
    {
      severity: "secondary",
      appearance: "solid",
      className: [
        "bg-button-bg-secondary-base",
        "hover:bg-button-bg-secondary-hover",
        "active:bg-button-bg-secondary-active",
        "text-button-fg-secondary",
      ],
    },
    {
      severity: "tertiary",
      appearance: "solid",
      className: [
        "bg-button-bg-tertiary-base",
        "hover:bg-button-bg-tertiary-hover",
        "active:bg-button-bg-tertiary-active",
        "text-button-fg-tertiary",
      ],
    },
    {
      severity: "warning",
      appearance: "solid",
      className: [
        "bg-button-bg-warning-base",
        "hover:bg-button-bg-warning-hover",
        "active:bg-button-bg-warning-active",
        "text-button-fg-warning",
      ],
    },
    {
      severity: "danger",
      appearance: "solid",
      className: [
        "bg-button-bg-danger-base",
        "hover:bg-button-bg-danger-hover",
        "active:bg-button-bg-danger-active",
        "text-button-fg-danger",
      ],
    },
    {
      severity: "primary",
      appearance: "subtle",
      className: [
        "bg-button-bg-primary-light-base",
        "hover:bg-button-bg-primary-light-hover",
        "active:bg-button-bg-primary-light-active",
        "text-button-fg-primary-light",
      ],
    },
    {
      severity: "secondary",
      appearance: "subtle",
      className: [
        "bg-button-bg-secondary-light-base",
        "hover:bg-button-bg-secondary-light-hover",
        "active:bg-button-bg-secondary-light-active",
        "text-button-fg-secondary-light",
      ],
    },
    {
      severity: "tertiary",
      appearance: "subtle",
      className: [
        "bg-button-bg-tertiary-light-base",
        "hover:bg-button-bg-tertiary-light-hover",
        "active:bg-button-bg-tertiary-light-active",
        "text-button-fg-tertiary-light",
      ],
    },
    {
      severity: "warning",
      appearance: "subtle",
      className: [
        "bg-button-bg-warning-light-base",
        "hover:bg-button-bg-warning-light-hover",
        "active:bg-button-bg-warning-light-active",
        "text-button-fg-warning-light",
      ],
    },
    {
      severity: "danger",
      appearance: "subtle",
      className: [
        "bg-button-bg-danger-light-base",
        "hover:bg-button-bg-danger-light-hover",
        "active:bg-button-bg-danger-light-active",
        "text-button-fg-danger-light",
      ],
    },
    {
      severity: "primary",
      appearance: "outline",
      className: [
        "border-button-border-primary",
        "hover:bg-button-bg-outlined-primary-hover",
        "active:bg-button-bg-outlined-primary-active",
        "text-button-fg-outlined-primary",
      ],
    },
    {
      severity: "secondary",
      appearance: "outline",
      className: [
        "border-button-border-secondary",
        "hover:bg-button-bg-outlined-secondary-hover",
        "active:bg-button-bg-outlined-secondary-active",
        "text-button-fg-outlined-secondary",
      ],
    },
    {
      severity: "tertiary",
      appearance: "outline",
      className: [
        "border-button-border-tertiary",
        "hover:bg-button-bg-outlined-tertiary-hover",
        "active:bg-button-bg-outlined-tertiary-active",
        "text-button-fg-outlined-tertiary",
      ],
    },
    {
      severity: "warning",
      appearance: "outline",
      className: [
        "border-button-border-warning",
        "hover:bg-button-bg-outlined-warning-hover",
        "active:bg-button-bg-outlined-warning-active",
        "text-button-fg-outlined-warning",
      ],
    },
    {
      severity: "danger",
      appearance: "outline",
      className: [
        "border-button-border-danger",
        "hover:bg-button-bg-outlined-danger-hover",
        "active:bg-button-bg-outlined-danger-active",
        "text-button-fg-outlined-danger",
      ],
    },
    {
      severity: "primary",
      appearance: "ghost",
      className: ["text-button-fg-primary-borderless"],
    },
    {
      severity: "secondary",
      appearance: "ghost",
      className: ["text-button-fg-secondary-borderless"],
    },
    {
      severity: "tertiary",
      appearance: "ghost",
      className: ["text-button-fg-tertiary-borderless"],
    },
    {
      severity: "warning",
      appearance: "ghost",
      className: ["text-button-fg-warning-readable"],
    },
    {
      severity: "danger",
      appearance: "ghost",
      className: ["text-button-fg-danger-borderless"],
    },
    {
      appearance: "outline",
      size: "sm",
      className: "border-(length:--border-width-button-sm)",
    },
    {
      appearance: "outline",
      size: "md",
      className: "border-(length:--border-width-button-md)",
    },
    {
      appearance: "outline",
      size: "lg",
      className: "border-(length:--border-width-button-lg)",
    },
  ],
  defaultVariants: {
    composition: false,
    density: "default",
    severity: "primary",
    appearance: "solid",
    size: "md",
    light: false,
  },
})

/** Values a `UIProvider` may set on Button-family components. */
export const buttonStyleValues = {
  size: ["sm", "md", "lg", "current"],
  appearance: ["solid", "subtle", "outline", "ghost"],
}

// Glyphs follow the button size; `current` keeps inheriting the label.
const buttonIconVariants = tv({
  variants: {
    size: {
      sm: "text-button-icon-sm",
      md: "text-button-icon-md",
      lg: "text-button-icon-lg",
      current: "",
    },
  },
  defaultVariants: { size: "md" },
})

export type ButtonAppearance = "solid" | "subtle" | "outline" | "ghost"
export type ButtonSeverity = NonNullable<
  VariantProps<typeof buttonVariants>["severity"]
>

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> &
  Omit<VariantProps<typeof buttonVariants>, "appearance"> & {
    /** Fill style. Falls back to the nearest `UIProvider`, then `solid`. */
    appearance?: ButtonAppearance
    /** Drop every Button visual (fill, color, geometry stays with `size`). */
    unstyled?: boolean
    icon?: IconType
    iconPosition?: "left" | "right"
    iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "current"
    uppercase?: boolean
    isLoading?: boolean
    loadingText?: string
    children?: ReactNode
    ref?: Ref<HTMLButtonElement>
  }

export function Button({
  density,
  severity,
  appearance: appearanceProp,
  unstyled = false,
  size: sizeProp,
  block,
  isLoading,
  loadingText,
  icon,
  iconPosition = "left",
  iconSize,
  uppercase = false,
  children,
  className,
  disabled,
  composition,
  ref,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Without deps, every render would detach and reattach consumer refs.
  useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement, [])

  // Click guards cover pointer, Enter/Space and implicit Enter submission.
  // Also guard requestSubmit() paths that do not dispatch a click.
  // biome-ignore lint/correctness/useExhaustiveDependencies: Rebind when the native form association changes.
  useEffect(() => {
    const button = buttonRef.current
    const form = button?.form
    if (!(isLoading && type === "submit" && form)) {
      return
    }
    function preventPendingSubmit(event: SubmitEvent) {
      if (!event.submitter || event.submitter === button) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    form.addEventListener("submit", preventPendingSubmit, true)
    return () => form.removeEventListener("submit", preventPendingSubmit, true)
  }, [isLoading, type, props.form])

  const { size, appearance } = useUIDefaults(
    "Button",
    { size: sizeProp, appearance: appearanceProp },
    buttonStyleValues
  )
  const iconClassName = buttonIconVariants({ size })

  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      aria-disabled={
        disabled || isLoading || props["aria-disabled"] || undefined
      }
      className={buttonVariants({
        density,
        severity,
        appearance: unstyled ? "unstyled" : appearance,
        size,
        block,
        uppercase,
        composition,
        className,
      })}
      data-loading={isLoading ? "" : undefined}
      disabled={disabled}
      onClick={(event) => {
        if (isLoading) {
          event.preventDefault()
          event.stopPropagation()
          return
        }
        onClick?.(event)
      }}
      ref={buttonRef}
      type={type}
    >
      {isLoading ? (
        <>
          <Icon
            className={iconClassName}
            icon="token-icon-button-spinner"
            size="current"
          />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Icon
              className={iconSize ? undefined : iconClassName}
              icon={icon}
              size={iconSize ?? "current"}
            />
          )}
          {children}
          {icon && iconPosition === "right" && (
            <Icon
              className={iconSize ? undefined : iconClassName}
              icon={icon}
              size={iconSize ?? "current"}
            />
          )}
        </>
      )}
    </button>
  )
}
