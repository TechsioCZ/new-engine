/*
 * Button — @techsio/ui-kit atom.
 *
 * @component Button
 * @componentVersion v0.3.2
 * @skill button-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the button-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ButtonHTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"
import { Icon } from "./icon"
import type { IconProps, IconType } from "./icon"

export const buttonVariants = tv({
  base: [
    "relative",
    "inline-flex cursor-pointer items-center justify-center whitespace-nowrap",
    "font-medium",
    "transition-all duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-button-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:text-button-fg-disabled",
  ],
  compoundVariants: [
    {
      className: [
        "bg-button-bg-primary-base",
        "hover:bg-button-bg-primary-hover",
        "active:bg-button-bg-primary-active",
        "text-button-fg-primary",
      ],
      theme: "solid",
      variant: "primary",
    },
    {
      className: [
        "bg-button-bg-secondary-base",
        "hover:bg-button-bg-secondary-hover",
        "active:bg-button-bg-secondary-active",
        "text-button-fg-secondary",
      ],
      theme: "solid",
      variant: "secondary",
    },
    {
      className: [
        "bg-button-bg-tertiary-base",
        "hover:bg-button-bg-tertiary-hover",
        "active:bg-button-bg-tertiary-active",
        "text-button-fg-tertiary",
      ],
      theme: "solid",
      variant: "tertiary",
    },
    {
      className: [
        "bg-button-bg-warning-base",
        "hover:bg-button-bg-warning-hover",
        "active:bg-button-bg-warning-active",
        "text-button-fg-warning",
      ],
      theme: "solid",
      variant: "warning",
    },
    {
      className: [
        "bg-button-bg-danger-base",
        "hover:bg-button-bg-danger-hover",
        "active:bg-button-bg-danger-active",
        "text-button-fg-danger",
      ],
      theme: "solid",
      variant: "danger",
    },
    {
      className: [
        "bg-button-bg-primary-light-base",
        "hover:bg-button-bg-primary-light-hover",
        "active:bg-button-bg-primary-light-active",
        "text-button-fg-primary-light",
      ],
      theme: "light",
      variant: "primary",
    },
    {
      className: [
        "bg-button-bg-secondary-light-base",
        "hover:bg-button-bg-secondary-light-hover",
        "active:bg-button-bg-secondary-light-active",
        "text-button-fg-secondary-light",
      ],
      theme: "light",
      variant: "secondary",
    },
    {
      className: [
        "bg-button-bg-tertiary-light-base",
        "hover:bg-button-bg-tertiary-light-hover",
        "active:bg-button-bg-tertiary-light-active",
        "text-button-fg-tertiary-light",
      ],
      theme: "light",
      variant: "tertiary",
    },
    {
      className: [
        "bg-button-bg-warning-light-base",
        "hover:bg-button-bg-warning-light-hover",
        "active:bg-button-bg-warning-light-active",
        "text-button-fg-warning-light",
      ],
      theme: "light",
      variant: "warning",
    },
    {
      className: [
        "bg-button-bg-danger-light-base",
        "hover:bg-button-bg-danger-light-hover",
        "active:bg-button-bg-danger-light-active",
        "text-button-fg-danger-light",
      ],
      theme: "light",
      variant: "danger",
    },
    {
      className: [
        "border-button-border-primary",
        "hover:bg-button-bg-outlined-primary-hover",
        "active:bg-button-bg-outlined-primary-active",
        "text-button-fg-outlined-primary",
      ],
      theme: "outlined",
      variant: "primary",
    },
    {
      className: [
        "border-button-border-secondary",
        "hover:bg-button-bg-outlined-secondary-hover",
        "active:bg-button-bg-outlined-secondary-active",
        "text-button-fg-outlined-secondary",
      ],
      theme: "outlined",
      variant: "secondary",
    },
    {
      className: [
        "border-button-border-tertiary",
        "hover:bg-button-bg-outlined-tertiary-hover",
        "active:bg-button-bg-outlined-tertiary-active",
        "text-button-fg-outlined-tertiary",
      ],
      theme: "outlined",
      variant: "tertiary",
    },
    {
      className: [
        "border-button-border-warning",
        "hover:bg-button-bg-outlined-warning-hover",
        "active:bg-button-bg-outlined-warning-active",
        "text-button-fg-outlined-warning",
      ],
      theme: "outlined",
      variant: "warning",
    },
    {
      className: [
        "border-button-border-danger",
        "hover:bg-button-bg-outlined-danger-hover",
        "active:bg-button-bg-outlined-danger-active",
        "text-button-fg-outlined-danger",
      ],
      theme: "outlined",
      variant: "danger",
    },
    {
      className: ["text-button-fg-primary-borderless"],
      theme: "borderless",
      variant: "primary",
    },
    {
      className: ["text-button-fg-secondary-borderless"],
      theme: "borderless",
      variant: "secondary",
    },
    {
      className: ["text-button-fg-tertiary-borderless"],
      theme: "borderless",
      variant: "tertiary",
    },
    {
      className: ["text-button-fg-warning-borderless"],
      theme: "borderless",
      variant: "warning",
    },
    {
      className: ["text-button-fg-danger-borderless"],
      theme: "borderless",
      variant: "danger",
    },
    {
      className: "border-(length:--border-width-button-sm)",
      size: "sm",
      theme: "outlined",
    },
    {
      className: "border-(length:--border-width-button-md)",
      size: "md",
      theme: "outlined",
    },
    {
      className: "border-(length:--border-width-button-lg)",
      size: "lg",
      theme: "outlined",
    },
  ],
  defaultVariants: {
    light: false,
    size: "md",
    theme: "solid",
    variant: "primary",
  },
  variants: {
    block: {
      true: "w-full",
    },
    size: {
      current: "gap-button-md text-inherit",
      lg: "gap-button-lg rounded-button-lg p-button-lg text-button-lg",
      md: "h-form-control-md gap-button-md rounded-button-md p-button-md text-button-md",
      sm: "h-form-control-sm gap-button-sm rounded-button-sm p-button-sm text-button-sm",
    },
    theme: {
      borderless:
        "bg-button-bg-borderless-base hover:bg-button-bg-borderless-hover active:bg-button-bg-borderless-active disabled:hover:bg-button-bg-borderless-base",
      light: "disabled:bg-button-bg-disabled",
      outlined:
        "border bg-button-bg-outlined disabled:border-0 disabled:bg-button-bg-disabled disabled:hover:bg-button-bg-disabled",
      solid: "disabled:bg-button-bg-disabled",
      unstyled: "",
    },
    uppercase: {
      true: "uppercase",
    },
    variant: {
      danger: "",
      primary: "",
      secondary: "",
      tertiary: "",
      warning: "",
    },
  },
})

export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  icon?: IconType | undefined
  iconPosition?: "left" | "right" | undefined
  // Mirrors the Icon size scale so both stay in lockstep.
  iconSize?: IconProps["size"] | undefined
  uppercase?: boolean | undefined
  isLoading?: boolean | undefined
  loadingText?: string | undefined
  children?: ReactNode | undefined
}

export const Button = ({
  variant,
  theme,
  size,
  block,
  isLoading,
  loadingText,
  icon,
  iconPosition = "left",
  iconSize,
  uppercase = false,
  children,
  className,
  disabled: disabledProp,
  ...props
}: ButtonProps & { ref?: Ref<HTMLButtonElement> | undefined }) => {
  const disabled = isLoading === true || disabledProp === true
  const iconNode =
    icon === undefined ? null : <Icon icon={icon} size={iconSize} />
  const leftIcon = iconPosition === "left" ? iconNode : null
  const rightIcon = iconPosition === "right" ? iconNode : null
  // Matches the previous `loadingText || children` fallback: blank text falls back too.
  const loadingLabel =
    loadingText === undefined || loadingText === "" ? children : loadingText

  return (
    <button
      className={buttonVariants({
        block,
        className,
        size,
        theme,
        uppercase,
        variant,
      })}
      disabled={disabled}
      // Explicit default preserves the native `submit` behavior; `props` still overrides it.
      type="submit"
      {...props}
    >
      {isLoading === true ? (
        <>
          <Icon className="mr-2" icon="token-icon-button-spinner" />
          {loadingLabel}
        </>
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}

Button.displayName = "Button"
