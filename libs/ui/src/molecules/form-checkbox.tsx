import { connect, machine } from "@zag-js/checkbox"
import { normalizeProps, useMachine } from "@zag-js/react"
import { type ReactNode, useId } from "react"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const checkboxVariants = tv({
  slots: {
    root: "flex items-center gap-form-checkbox-gap",
    control: [
      "relative shrink-0 cursor-pointer",
      "size-checkbox",
      "rounded-checkbox border border-checkbox-border",
      "bg-checkbox-bg",
      "flex items-center justify-center",
      "transition-all duration-200 motion-reduce:transition-none",
      "data-[state=checked]:bg-checkbox-bg-checked",
      "data-[state=checked]:border-checkbox-border-checked",
      "data-[state=indeterminate]:bg-checkbox-bg-indeterminate",
      "data-[state=indeterminate]:border-checkbox-border-indeterminate",
      "data-disabled:cursor-not-allowed",
      "data-disabled:bg-checkbox-bg-disabled",
      "data-disabled:border-checkbox-border-disabled",
      "data-focus-visible:outline-(style:--default-ring-style) data-focus-visible:outline-(length:--default-ring-width)",
      "data-focus-visible:outline-checkbox-ring-focus",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-(length:--border-width-validation)",
      "data-invalid:border-checkbox-border-error",
      "data-invalid:outline-(style:--default-ring-style) data-invalid:outline-(length:--default-ring-width)",
      "data-invalid:outline-checkbox-ring-error",
      "data-invalid:outline-offset-(length:--default-ring-offset)",
    ],
    indicator: [
      "text-checkbox-fg-checked",
      "data-[state=checked]:token-icon-checkbox",
      "data-[state=indeterminate]:size-checkbox-indeterminate-icon",
      "data-[state=indeterminate]:rounded-full",
      "data-[state=indeterminate]:bg-checkbox-fg-indeterminate",
      "data-disabled:text-checkbox-fg-disabled",
    ],
    label: [
      "cursor-pointer select-none",
      "text-label-fg",
      "data-disabled:cursor-not-allowed",
      "data-disabled:text-label-fg-disabled",
    ],
    hiddenInput: "sr-only",
    textIndented: "data-[icon=false]:pl-form-checkbox-text-offset",
  },
  variants: {
    size: {
      sm: { label: "text-label-sm" },
      md: { label: "text-label-md" },
      lg: { label: "text-label-lg" },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

export type FormCheckboxProps = {
  id?: string
  name?: string
  value?: string
  checked?: boolean
  defaultChecked?: boolean
  indeterminate?: boolean
  disabled?: boolean
  required?: boolean
  readOnly?: boolean
  children?: ReactNode
  label?: ReactNode
  helpText?: ReactNode
  validateStatus?: "default" | "error" | "success" | "warning"
  showHelpTextIcon?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  onCheckedChange?: (checked: boolean) => void
}

export function FormCheckbox({
  id,
  name,
  value,
  checked,
  defaultChecked,
  indeterminate,
  disabled = false,
  required = false,
  readOnly = false,
  children,
  label,
  helpText,
  validateStatus = "default",
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  className,
  onCheckedChange,
}: FormCheckboxProps) {
  const generatedId = useId()
  const uniqueId = id || generatedId

  const service = useMachine(machine, {
    id: uniqueId,
    name,
    value,
    checked: indeterminate ? "indeterminate" : checked,
    defaultChecked,
    disabled,
    invalid: validateStatus === "error",
    readOnly,
    required,
    onCheckedChange: (details) => {
      onCheckedChange?.(details.checked === true)
    },
  })

  const api = connect(service, normalizeProps)

  const styles = checkboxVariants({ size })

  const labelContent = label ?? children

  return (
    <div className={className}>
      <label className={styles.root()} {...api.getRootProps()}>
        <div className={styles.control()} {...api.getControlProps()}>
          <span className={styles.indicator()} {...api.getIndicatorProps()} />
        </div>
        <input
          className={styles.hiddenInput()}
          {...api.getHiddenInputProps()}
        />
        {labelContent && (
          <span className={styles.label()} {...api.getLabelProps()}>
            {labelContent}
            {required && <span className="text-label-fg-required"> *</span>}
          </span>
        )}
      </label>
      {helpText && (
        <div className={styles.textIndented()} data-icon={showHelpTextIcon}>
          <StatusText
            showIcon={showHelpTextIcon}
            size={size}
            status={validateStatus}
          >
            {helpText}
          </StatusText>
        </div>
      )}
    </div>
  )
}

FormCheckbox.displayName = "FormCheckbox"
