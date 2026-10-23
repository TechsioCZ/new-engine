/**
 * Input — @techsio/ui-kit atom.
 *
 * @component Input
 * @componentVersion v1.1.2
 * @skill input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type InputHTMLAttributes,
  type Ref,
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

const inputVariants = tv({
  base: [
    "form-control-readonly input-readonly form-control-disabled block w-full",
    "font-input",
    "bg-input-bg-base",
    "text-input-fg",
    "placeholder:font-input-placeholder",
    "placeholder:text-input-fg-placeholder",
    "border-(length:--border-width-input) border-input-border-base",
    "rounded-input",
    "transition duration-200 motion-reduce:transition-none",
    "hover:border-input-border-hover hover:bg-input-bg-hover",
    "focus:border-input-border-focus focus:bg-input-bg-focus",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-input-ring",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "disabled:cursor-not-allowed disabled:hover:bg-input-bg-disabled",
    // Native constraint validation (required, type, pattern…) once the user
    // has interacted with the field — never on first render.
    "user-invalid:border-(length:--border-width-validation)",
    "user-invalid:border-input-border-danger-base",
    "user-invalid:hover:border-input-border-danger-hover",
    "user-invalid:focus:border-input-border-danger-focus",
  ],
  variants: {
    size: {
      sm: "h-form-control-sm rounded-input-sm p-input-sm text-input-sm",
      md: "h-form-control-md rounded-input-md p-input-md text-input-md",
      lg: "h-form-control-lg rounded-input-lg p-input-lg text-input-lg",
    },
    variant: {
      default: "",
      error: [
        "border-(length:--border-width-validation)",
        "border-input-border-danger-base",
        "hover:border-input-border-danger-hover",
        "focus:border-input-border-danger-focus",
      ],
      success: [
        "border-(length:--border-width-validation)",
        "border-input-border-success-base",
        "hover:border-input-border-success-hover",
        "focus:border-input-border-success-focus",
      ],
      warning: [
        "border-(length:--border-width-validation)",
        "border-input-border-warning-base",
        "hover:border-input-border-warning-hover",
        "focus:border-input-border-warning-focus",
      ],
    },
    withButtonInside: {
      false: "",
      right: "pe-input-with-button",
      left: "ps-input-with-button",
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
  },
})

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> &
  VariantProps<typeof inputVariants> & {
    ref?: Ref<HTMLInputElement>
  }

export function Input({
  size,
  variant,
  disabled,
  readOnly,
  hideSearchClear,
  id,
  ref,
  withButtonInside,
  className,
  ...props
}: InputProps) {
  const generatedId = useId()
  const currentValue = useRef({ value: props.value, checked: props.checked })
  useLayoutEffect(() => {
    currentValue.current = { value: props.value, checked: props.checked }
  })
  const inputRef = useMemo(
    () => (input: HTMLInputElement | null) => {
      const stopReset = input
        ? subscribeOwnerFormReset(input, () => {
            const { value, checked } = currentValue.current
            if (input.type === "checkbox" || input.type === "radio") {
              syncReactFormControl(input, checked ?? input.checked)
            } else {
              syncReactFormControl(
                input,
                value == null ? input.value : String(value)
              )
            }
          })
        : undefined
      const cleanup = typeof ref === "function" ? ref(input) : undefined
      if (ref && typeof ref !== "function") {
        ref.current = input
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
    <input
      className={inputVariants({
        size,
        variant,
        disabled,
        hideSearchClear: readOnly || hideSearchClear,
        withButtonInside,
        className,
      })}
      data-readonly={readOnly ? "" : undefined}
      disabled={disabled}
      id={id || generatedId}
      readOnly={readOnly}
      ref={inputRef}
      {...props}
      aria-invalid={variant === "error" ? true : props["aria-invalid"]}
    />
  )
}
