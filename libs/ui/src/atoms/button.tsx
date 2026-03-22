import type { ButtonHTMLAttributes, ReactNode, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"
import { Icon, type IconType } from "./icon"

export const buttonVariants = tv({
  base: [
    "relative",
    "inline-flex cursor-pointer items-center justify-center",
    "font-medium",
    "transition-all duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-button-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:text-button-fg-disabled",
  ],
  variants: {
    variant: {
      primary: "",
      secondary: "",
      tertiary: "",
      danger: "",
      warning: "",
    },
    theme: {
      solid: "disabled:bg-button-bg-disabled",
      light: "disabled:bg-button-bg-disabled",
      borderless:
        "bg-button-bg-borderless hover:bg-button-bg-borderless-hover active:bg-button-bg-borderless-active disabled:hover:bg-button-bg-borderless",
      outlined:
        "border bg-button-bg-outlined disabled:border-button-border-disabled disabled:hover:bg-button-bg-outlined",
      unstyled: "",
    },
    uppercase: {
      true: "uppercase",
    },
    size: {
      sm: "h-form-control-sm gap-button-sm rounded-button-sm p-button-sm text-button-sm",
      md: "h-form-control-md gap-button-md rounded-button-md p-button-md text-button-md",
      lg: "gap-button-lg rounded-button-lg p-button-lg text-button-lg",
      current: "gap-button-md text-inherit",
    },
    block: {
      true: "w-full",
    },
  },
  compoundVariants: [
    {
      variant: "primary",
      theme: "solid",
      className: [
        "bg-button-bg-primary",
        "hover:bg-button-bg-primary-hover",
        "active:bg-button-bg-primary-active",
        "text-button-fg-primary",
      ],
    },
    {
      variant: "secondary",
      theme: "solid",
      className: [
        "bg-button-bg-secondary",
        "hover:bg-button-bg-secondary-hover",
        "active:bg-button-bg-secondary-active",
        "text-button-fg-secondary",
      ],
    },
    {
      variant: "tertiary",
      theme: "solid",
      className: [
        "bg-button-bg-tertiary",
        "hover:bg-button-bg-tertiary-hover",
        "active:bg-button-bg-tertiary-active",
        "text-button-fg-tertiary",
      ],
    },
    {
      variant: "warning",
      theme: "solid",
      className: [
        "bg-button-bg-warning",
        "hover:bg-button-bg-warning-hover",
        "active:bg-button-bg-warning-active",
        "text-button-fg-warning",
      ],
    },
    {
      variant: "danger",
      theme: "solid",
      className: [
        "bg-button-bg-danger",
        "hover:bg-button-bg-danger-hover",
        "active:bg-button-bg-danger-active",
        "text-button-fg-danger",
      ],
    },
    {
      variant: "primary",
      theme: "light",
      className: [
        "bg-button-bg-primary-light",
        "hover:bg-button-bg-primary-light-hover",
        "active:bg-button-bg-primary-light-active",
        "text-button-fg-primary-light",
      ],
    },
    {
      variant: "secondary",
      theme: "light",
      className: [
        "bg-button-bg-secondary-light",
        "hover:bg-button-bg-secondary-light-hover",
        "active:bg-button-bg-secondary-light-active",
        "text-button-fg-secondary-light",
      ],
    },
    {
      variant: "tertiary",
      theme: "light",
      className: [
        "bg-button-bg-tertiary-light",
        "hover:bg-button-bg-tertiary-light-hover",
        "active:bg-button-bg-tertiary-light-active",
        "text-button-fg-tertiary-light",
      ],
    },
    {
      variant: "warning",
      theme: "light",
      className: [
        "bg-button-bg-warning-light",
        "hover:bg-button-bg-warning-light-hover",
        "active:bg-button-bg-warning-light-active",
        "text-button-fg-warning-light",
      ],
    },
    {
      variant: "danger",
      theme: "light",
      className: [
        "bg-button-bg-danger-light",
        "hover:bg-button-bg-danger-light-hover",
        "active:bg-button-bg-danger-light-active",
        "text-button-fg-danger-light",
      ],
    },
    {
      variant: "primary",
      theme: "outlined",
      className: [
        "border-button-border-primary",
        "hover:bg-button-bg-outlined-primary-hover",
        "active:bg-button-bg-outlined-primary-active",
        "text-button-fg-outlined-primary",
      ],
    },
    {
      variant: "secondary",
      theme: "outlined",
      className: [
        "border-button-border-secondary",
        "hover:bg-button-bg-outlined-secondary-hover",
        "active:bg-button-bg-outlined-secondary-active",
        "text-button-fg-outlined-secondary",
      ],
    },
    {
      variant: "tertiary",
      theme: "outlined",
      className: [
        "border-button-border-tertiary",
        "hover:bg-button-bg-outlined-tertiary-hover",
        "active:bg-button-bg-outlined-tertiary-active",
        "text-button-fg-outlined-tertiary",
      ],
    },
    {
      variant: "warning",
      theme: "outlined",
      className: [
        "border-button-border-warning",
        "hover:bg-button-bg-outlined-warning-hover",
        "active:bg-button-bg-outlined-warning-active",
        "text-button-fg-outlined-warning",
      ],
    },
    {
      variant: "danger",
      theme: "outlined",
      className: [
        "border-button-border-danger",
        "hover:bg-button-bg-outlined-danger-hover",
        "active:bg-button-bg-outlined-danger-active",
        "text-button-fg-outlined-danger",
      ],
    },
    {
      variant: "primary",
      theme: "borderless",
      className: ["text-button-fg-primary-borderless"],
    },
    {
      variant: "secondary",
      theme: "borderless",
      className: ["text-button-fg-secondary-borderless"],
    },
    {
      variant: "tertiary",
      theme: "borderless",
      className: ["text-button-fg-tertiary-borderless"],
    },
    {
      variant: "warning",
      theme: "borderless",
      className: ["text-button-fg-warning-borderless"],
    },
    {
      variant: "danger",
      theme: "borderless",
      className: ["text-button-fg-danger-borderless"],
    },
    {
      theme: "outlined",
      size: "sm",
      className: "border-(length:--border-button-width-sm)",
    },
    {
      theme: "outlined",
      size: "md",
      className: "border-(length:--border-button-width-md)",
    },
    {
      theme: "outlined",
      size: "lg",
      className: "border-(length:--border-button-width-lg)",
    },
  ],
  defaultVariants: {
    variant: "primary",
    theme: "solid",
    size: "md",
    light: false,
  },
})

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  icon?: IconType
  iconPosition?: "left" | "right"
  iconSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "current"
  uppercase?: boolean
  isLoading?: boolean
  loadingText?: string
  children?: ReactNode
}

export function Button({
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
}: ButtonProps & { ref?: Ref<HTMLButtonElement> }) {
  const disabled = isLoading || disabledProp

  return (
    <button
      className={buttonVariants({
        variant,
        theme,
        size,
        block,
        uppercase,
        className,
      })}
      disabled={disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <Icon className="mr-2" icon="icon-[svg-spinners--ring-resize]" />
          {loadingText || children}
        </>
      ) : (
        <>
          {icon && iconPosition === "left" && <Icon icon={icon} size={iconSize} />}
          {children}
          {icon && iconPosition === "right" && <Icon icon={icon} size={iconSize} />}
        </>
      )}
    </button>
  )
}
