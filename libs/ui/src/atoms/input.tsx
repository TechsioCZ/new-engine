import type { InputHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"
import { tv } from "../utils"

const inputVariants = tv({
  base: [
    "block w-full",
    "font-normal",
    "bg-input",
    "text-input-fg",
    "placeholder:font-normal",
    "placeholder:text-input-fg-placeholder",
    "border-(length:--border-width-input) border-input-border",
    "rounded-input",
    "transition-all duration-200 motion-reduce:transition-none",
    "hover:border-input-border-hover hover:bg-input-hover",
    "focus:border-input-border-focus focus:bg-input-focus",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-input-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:hover:bg-input-bg-disabled",
  ],
  variants: {
    size: {
      sm: "h-form-control-sm rounded-input-sm p-input-sm text-input-sm",
      md: "h-form-control-md rounded-input-md p-input-md text-input-md",
      lg: "p-input-lg text-input-lg",
    },
    variant: {
      default: "",
      error: [
        "border-(length:--border-width-validation)",
        "border-input-border-danger",
        "hover:border-input-border-danger-hover",
        "focus:border-input-border-danger-focus",
      ],
      success: [
        "border-(length:--border-width-validation)",
        "border-input-border-success",
        "hover:border-input-border-success-hover",
        "focus:border-input-border-success-focus",
      ],
      warning: [
        "border-(length:--border-width-validation)",
        "border-input-border-warning",
        "hover:border-input-border-warning-hover",
        "focus:border-input-border-warning-focus",
      ],
    },
    withButtonInside: {
      false: "",
      right: "pe-with-button",
      left: "ps-with-button",
    },
    hideSearchClear: {
      true: "[&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden",
    },
    disabled: {
      true: [
        "bg-input-bg-disabled",
        "border-input-border-disabled",
        "text-input-fg-disabled",
      ],
    },
  },
  defaultVariants: {
    size: "md",
    variant: "default",
    hideSearchClear: true,
    withIconInside: false,
  },
})

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  ref?: Ref<HTMLInputElement>
}

export function Input({
  size,
  variant,
  disabled,
  ref,
  withButtonInside,
  className,
  ...props
}: InputProps) {
  return (
    <input
      className={inputVariants({
        size,
        variant,
        disabled,
        withButtonInside,
        className,
      })}
      disabled={disabled}
      ref={ref}
      {...props}
    />
  )
}
