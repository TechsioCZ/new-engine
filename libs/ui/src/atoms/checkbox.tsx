/**
 * Checkbox — @techsio/ui-kit atom.
 *
 * @component Checkbox
 * @componentVersion v1.2.2
 * @skill checkbox-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the checkbox-usage skill's component_version and a changelog entry. Bump all three together.
 */
import {
  type InputHTMLAttributes,
  type Ref,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react"
import { useChoiceInputRef } from "../internal/choice-control"
import {
  subscribeOwnerFormReset,
  syncReactFormControl,
} from "../internal/form-control-lifecycle"
import { tv } from "../utils"

const checkboxVariants = tv({
  base: [
    "form-control-readonly relative shrink-0 cursor-pointer appearance-none",
    "data-readonly:checked:text-checkbox-fg-readonly",
    "data-readonly:indeterminate:after:bg-checkbox-fg-readonly",
    "border-(length:--border-width-checkbox) rounded-checkbox-control border-checkbox-border-base",
    "bg-checkbox-bg-base",
    "after:-translate-1/2 after:absolute after:top-1/2 after:left-1/2",
    "checked:bg-checkbox-bg-checked",
    "checked:border-checkbox-border-checked",
    "checked:not-indeterminate:after:token-icon-checkbox",
    "checked:text-checkbox-fg-checked",
    "indeterminate:bg-checkbox-bg-indeterminate",
    "indeterminate:border-checkbox-border-indeterminate",
    "indeterminate:after:w-checkbox-indeterminate-icon",
    "indeterminate:after:h-checkbox-indeterminate-stroke",
    "indeterminate:after:rounded-full",
    "indeterminate:after:bg-checkbox-fg-indeterminate",
    "disabled:cursor-not-allowed",
    "disabled:bg-checkbox-bg-disabled",
    "disabled:text-checkbox-fg-disabled",
    "disabled:border-checkbox-border-disabled",
    "disabled:checked:bg-checkbox-bg-disabled",
    "disabled:checked:text-checkbox-fg-disabled",
    "disabled:checked:border-checkbox-border-disabled",
    "disabled:indeterminate:bg-checkbox-bg-disabled",
    "disabled:indeterminate:border-checkbox-border-disabled",
    "disabled:indeterminate:after:bg-checkbox-fg-disabled",
    "transition duration-200 motion-reduce:transition-none",
    "focus-visible:checkbox-focus-outline",
    "data-invalid:border-(length:--border-width-validation)",
    "data-invalid:border-checkbox-border-error",
  ],
  variants: {
    size: {
      sm: "size-form-checkbox-control-sm",
      md: "size-form-checkbox-control-md",
      lg: "size-form-checkbox-control-lg",
    },
  },
  defaultVariants: { size: "md" },
})

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> & {
  size?: "sm" | "md" | "lg"
  ref?: Ref<HTMLInputElement>
  indeterminate?: boolean
  invalid?: boolean
}

export function Checkbox({
  className,
  size = "md",
  indeterminate,
  invalid,
  ref,
  readOnly = false,
  onClick,
  onChange,
  onKeyDown,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const currentValue = useRef({ checked: props.checked, indeterminate })
  useLayoutEffect(() => {
    currentValue.current = { checked: props.checked, indeterminate }
  })
  const choiceRef = useChoiceInputRef(ref, indeterminate ?? false)
  const setInputRef = useMemo(
    () => (node: HTMLInputElement | null) => {
      inputRef.current = node
      const cleanup = choiceRef(node)
      return () => {
        inputRef.current = null
        cleanup()
      }
    },
    [choiceRef]
  )
  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) {
      return
    }
    return subscribeOwnerFormReset(input, () => {
      // Native reset bypasses React's controlled change restoration. Restore the
      // latest parent value without synthesizing a change or moving focus.
      // Assign even for uncontrolled inputs: native reset bypasses React's
      // checked tracker, otherwise the next identical activation loses onChange.
      syncReactFormControl(input, currentValue.current.checked ?? input.checked)
      input.indeterminate = currentValue.current.indeterminate ?? false
    })
  }, [])

  return (
    <input
      aria-invalid={invalid || undefined}
      className={checkboxVariants({ size, className })}
      data-invalid={invalid || undefined}
      ref={setInputRef}
      type="checkbox"
      {...props}
      aria-readonly={(readOnly && !props.disabled) || undefined}
      data-readonly={readOnly && !props.disabled ? "" : undefined}
      onChange={(event) => {
        if (!(readOnly || props.disabled)) {
          onChange?.(event)
          event.currentTarget.indeterminate = indeterminate ?? false
        }
      }}
      onClick={(event) => {
        if (readOnly) {
          event.preventDefault()
          return
        }
        onClick?.(event)
      }}
      onKeyDown={(event) => {
        if (readOnly && event.key === " ") {
          event.preventDefault()
          return
        }
        onKeyDown?.(event)
      }}
      readOnly={readOnly}
    />
  )
}

Checkbox.displayName = "Checkbox"
