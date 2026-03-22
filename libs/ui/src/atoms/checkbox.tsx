import type { InputHTMLAttributes, Ref } from "react"
import { tv } from "../utils"

const checkboxVariants = tv({
  base: [
    "relative shrink-0 cursor-pointer appearance-none",
    "size-checkbox",
    "rounded-checkbox border border-checkbox-border",
    "bg-checkbox-bg",
    "after:-translate-x-1/2 after:-translate-y-1/2 after:absolute after:top-1/2 after:left-1/2",
    "checked:bg-checkbox-bg-checked",
    "checked:border-checkbox-border-checked",
    "checked:after:token-icon-checkbox",
    "checked:text-checkbox-fg-checked",
    "indeterminate:bg-checkbox-bg-indeterminate",
    "indeterminate:border-checkbox-border-indeterminate",
    "indeterminate:after:size-checkbox-indeterminate-icon",
    "indeterminate:after:rounded-full",
    "indeterminate:after:bg-checkbox-fg-indeterminate",
    "disabled:cursor-not-allowed",
    "disabled:bg-checkbox-bg-disabled",
    "disabled:text-checkbox-fg-disabled",
    "disabled:border-checkbox-border-disabled",
    "disabled:checked:bg-checkbox-bg-disabled",
    "disabled:checked:text-checkbox-fg-disabled",
    "disabled:checked:border-checkbox-border-disabled",
    "transition-all duration-200 motion-reduce:transition-none",
    "focus-visible:outline-(style:--default-ring-style) focus-visible:outline-(length:--default-ring-width)",
    "focus-visible:outline-checkbox-ring-focus",
    "focus-visible:outline-offset-(length:--default-ring-offset)",
    "data-invalid:border-(length:--border-width-validation)",
    "data-invalid:border-checkbox-border-error",
    "data-invalid:outline-(style:--default-ring-style) data-invalid:outline-(length:--default-ring-width)",
    "data-invalid:outline-checkbox-ring-error",
    "data-invalid:outline-offset-(length:--default-ring-offset)",
  ],
})

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>
  indeterminate?: boolean
  invalid?: boolean
}

export function Checkbox({
  className,
  indeterminate,
  invalid,
  ref,
  ...props
}: CheckboxProps) {
  const setIndeterminate = (node: HTMLInputElement | null) => {
    if (node) {
      node.indeterminate = indeterminate ?? false
    }
    if (typeof ref === "function") {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  return (
    <input
      aria-invalid={invalid || undefined}
      className={checkboxVariants({ className })}
      data-invalid={invalid || undefined}
      ref={setIndeterminate}
      type="checkbox"
      {...props}
    />
  )
}

Checkbox.displayName = "Checkbox"
