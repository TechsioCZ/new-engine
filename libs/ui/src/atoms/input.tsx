/*
 * Input — @techsio/ui-kit atom.
 *
 * @component Input
 * @componentVersion v1.0.1
 * @skill input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { InputHTMLAttributes, Ref } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const VALIDATION_BORDER_WIDTH_CLASS =
  "border-(length:--border-width-validation)"

const inputVariants = tv({
  base: [
    "block w-full",
    "font-normal",
    "bg-input-bg-base",
    "text-input-fg",
    "placeholder:font-normal",
    "placeholder:text-input-fg-placeholder",
    "border-(length:--border-width-input) border-input-border-base",
    "rounded-input",
    "transition-all duration-200 motion-reduce:transition-none",
    "hover:border-input-border-hover hover:bg-input-bg-hover",
    "focus:border-input-border-focus focus:bg-input-bg-focus",
    "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
    "focus-visible:outline-input-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:hover:bg-input-bg-disabled",
  ],
  defaultVariants: {
    hideSearchClear: true,
    size: "md",
    variant: "default",
    withIconInside: false,
  },
  variants: {
    disabled: {
      true: [
        "bg-input-bg-disabled",
        "border-input-border-disabled",
        "text-input-fg-disabled",
      ],
    },
    hideSearchClear: {
      true: "[&::-ms-clear]:hidden [&::-webkit-search-cancel-button]:hidden",
    },
    size: {
      lg: "h-form-control-lg rounded-input-lg p-input-lg text-input-lg",
      md: "h-form-control-md rounded-input-md p-input-md text-input-md",
      sm: "h-form-control-sm rounded-input-sm p-input-sm text-input-sm",
    },
    variant: {
      default: "",
      error: [
        VALIDATION_BORDER_WIDTH_CLASS,
        "border-input-border-danger-base",
        "hover:border-input-border-danger-hover",
        "focus:border-input-border-danger-focus",
      ],
      success: [
        VALIDATION_BORDER_WIDTH_CLASS,
        "border-input-border-success-base",
        "hover:border-input-border-success-hover",
        "focus:border-input-border-success-focus",
      ],
      warning: [
        VALIDATION_BORDER_WIDTH_CLASS,
        "border-input-border-warning-base",
        "hover:border-input-border-warning-hover",
        "focus:border-input-border-warning-focus",
      ],
    },
    withButtonInside: {
      false: "",
      left: "ps-input-with-button",
      right: "pe-input-with-button",
    },
  },
})

export interface InputProps
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  ref?: Ref<HTMLInputElement> | undefined
}

export const Input = ({
  size,
  variant,
  disabled,
  ref,
  withButtonInside,
  className,
  ...props
}: InputProps) => (
  <input
    className={inputVariants({
      className,
      disabled,
      size,
      variant,
      withButtonInside,
    })}
    disabled={disabled}
    ref={ref}
    {...props}
  />
)
