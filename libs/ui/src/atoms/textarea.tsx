/*
 * Textarea — @techsio/ui-kit atom.
 *
 * @component Textarea
 * @componentVersion v1.0.1
 * @skill textarea-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the textarea-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { Ref, TextareaHTMLAttributes } from "react"
import type { VariantProps } from "tailwind-variants"

import { tv } from "../utils"

const validationBorderWidth = "border-(length:--border-width-validation)"

const textareaVariants = tv({
  base: [
    "block w-full",
    "font-normal",
    "bg-textarea-bg",
    "text-textarea-fg",
    "placeholder:font-normal",
    "placeholder:text-textarea-fg-placeholder",
    "border-(length:--border-width-textarea) border-textarea-border",
    "rounded-textarea",
    "transition-all duration-200 motion-reduce:transition-none",
    "hover:border-textarea-border-hover hover:bg-textarea-bg-hover",
    "focus:border-textarea-border-focus focus:bg-textarea-bg-focus",
    "focus-visible:outline-(length:--default-ring-width) focus-visible:outline-(style:--default-ring-style)",
    "focus-visible:outline-textarea-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:pointer-events-none disabled:border-textarea-border-disabled disabled:bg-textarea-bg-disabled disabled:text-textarea-fg-disabled",
  ],
  defaultVariants: {
    resize: "y",
    size: "md",
    variant: "default",
  },
  variants: {
    readonly: {
      true: "cursor-default border-textarea-border-disabled bg-textarea-bg-disabled text-textarea-fg-disabled",
    },
    resize: {
      auto: "field-sizing-content resize-none",
      both: "resize",
      none: "resize-none",
      x: "resize-x",
      y: "resize-y",
    },
    size: {
      lg: "p-textarea-lg text-textarea-lg",
      md: "rounded-textarea-md p-textarea-md text-textarea-md",
      sm: "rounded-textarea-sm p-textarea-sm text-textarea-sm",
    },
    variant: {
      borderless: [
        "border-transparent",
        "bg-textarea-bg-borderless",
        "hover:bg-textarea-bg-borderless-hover",
        "focus:bg-textarea-bg-borderless-focus",
      ],
      default: "",
      error: [
        validationBorderWidth,
        "border-textarea-border-danger-base",
        "hover:border-textarea-border-danger-hover",
        "focus:border-textarea-border-danger-focus",
        "placeholder:text-textarea-placeholder-danger",
      ],
      success: [
        validationBorderWidth,
        "border-textarea-border-success-base",
        "hover:border-textarea-border-success-hover",
        "focus:border-textarea-border-success-focus",
      ],
      warning: [
        validationBorderWidth,
        "border-textarea-border-warning-base",
        "hover:border-textarea-border-warning-hover",
        "focus:border-textarea-border-warning-focus",
      ],
    },
  },
})

export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {
  ref?: Ref<HTMLTextAreaElement> | undefined
}

export const Textarea = ({
  size,
  resize,
  variant,
  readonly,
  className,
  ref,
  ...props
}: TextareaProps) => (
  <textarea
    className={textareaVariants({
      className,
      readonly,
      resize,
      size,
      variant,
    })}
    readOnly={readonly}
    ref={ref}
    {...props}
  />
)

Textarea.displayName = "Textarea"
