/**
 * Textarea — @techsio/ui-kit atom.
 *
 * @component Textarea
 * @componentVersion v1.0.4
 * @skill textarea-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the textarea-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type Ref,
  type TextareaHTMLAttributes,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react"
import type { VariantProps } from "tailwind-variants"
import {
  subscribeOwnerFormReset,
  syncReactFormControl,
} from "../internal/form-control-lifecycle"
import { tv } from "../utils"

const textareaVariants = tv({
  base: [
    "form-control-readonly textarea-readonly form-control-disabled block w-full",
    "font-normal",
    "bg-textarea-bg",
    "text-textarea-fg",
    "placeholder:font-normal",
    "placeholder:text-textarea-fg-placeholder",
    "border-(length:--border-width-textarea) border-textarea-border",
    "rounded-textarea",
    "transition duration-200 motion-reduce:transition-none",
    "hover:border-textarea-border-hover hover:bg-textarea-bg-hover",
    "focus:border-textarea-border-focus focus:bg-textarea-bg-focus",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-textarea-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:border-textarea-border-disabled disabled:bg-textarea-bg-disabled disabled:text-textarea-fg-disabled",
    // Native constraint validation once the user has interacted with the field.
    "user-invalid:border-(length:--border-width-validation)",
    "user-invalid:border-textarea-border-danger-base",
    "user-invalid:hover:border-textarea-border-danger-hover",
    "user-invalid:focus:border-textarea-border-danger-focus",
  ],
  variants: {
    variant: {
      default: "",
      error: [
        "border-(length:--border-width-validation)",
        "border-textarea-border-danger-base",
        "hover:border-textarea-border-danger-hover",
        "focus:border-textarea-border-danger-focus",
        "placeholder:text-textarea-placeholder-danger",
      ],
      success: [
        "border-(length:--border-width-validation)",
        "border-textarea-border-success-base",
        "hover:border-textarea-border-success-hover",
        "focus:border-textarea-border-success-focus",
      ],
      warning: [
        "border-(length:--border-width-validation)",
        "border-textarea-border-warning-base",
        "hover:border-textarea-border-warning-hover",
        "focus:border-textarea-border-warning-focus",
      ],
      borderless: [
        "border-transparent",
        "bg-textarea-bg-borderless",
        "hover:bg-textarea-bg-borderless-hover",
        "focus:bg-textarea-bg-borderless-focus",
      ],
    },
    size: {
      sm: "rounded-textarea-sm p-textarea-sm text-textarea-sm",
      md: "rounded-textarea-md p-textarea-md text-textarea-md",
      lg: "p-textarea-lg text-textarea-lg",
    },
    resize: {
      none: "resize-none",
      y: "resize-y",
      x: "resize-x",
      both: "resize",
      auto: "field-sizing-content resize-none",
    },
  },
  defaultVariants: {
    size: "md",
    resize: "y",
    variant: "default",
  },
})

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "size"
> &
  VariantProps<typeof textareaVariants> & {
    ref?: Ref<HTMLTextAreaElement>
    /** @deprecated Use native readOnly. Both aliases share appearance and behavior. */
    readonly?: boolean
  }

export function Textarea({
  size,
  resize,
  variant,
  readonly,
  readOnly = readonly,
  id,
  className,
  ref,
  ...props
}: TextareaProps) {
  const generatedId = useId()
  const currentValue = useRef(props.value)
  useLayoutEffect(() => {
    currentValue.current = props.value
  })
  const textareaRef = useMemo(
    () => (textarea: HTMLTextAreaElement | null) => {
      const stopReset = textarea
        ? subscribeOwnerFormReset(textarea, () => {
            syncReactFormControl(
              textarea,
              currentValue.current == null
                ? textarea.value
                : String(currentValue.current)
            )
          })
        : undefined
      const cleanup = typeof ref === "function" ? ref(textarea) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = textarea
      }
      return () => {
        stopReset?.()
        if (typeof cleanup === "function") {
          cleanup()
        } else if (typeof ref === "function") {
          ref(null)
        } else if (ref) {
          ref.current = null
        }
      }
    },
    [ref]
  )
  return (
    <textarea
      className={textareaVariants({
        size,
        resize,
        variant,
        className,
      })}
      data-readonly={readOnly ? "" : undefined}
      id={id || generatedId}
      readOnly={readOnly}
      ref={textareaRef}
      {...props}
      aria-invalid={variant === "error" ? true : props["aria-invalid"]}
    />
  )
}

Textarea.displayName = "Textarea"
