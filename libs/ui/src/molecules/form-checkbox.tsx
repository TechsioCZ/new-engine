/*
 * FormCheckbox — @techsio/ui-kit molecule.
 *
 * @component FormCheckbox
 * @componentVersion v1.0.1
 * @skill form-checkbox-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-checkbox-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/checkbox"
import type { CheckedState } from "@zag-js/checkbox"
import { normalizeProps, useMachine } from "@zag-js/react"
import { useId } from "react"
import type { ReactNode } from "react"

import { StatusText } from "../atoms/status-text"
import type { StatusTextProps } from "../atoms/status-text"
import { tv } from "../utils"

const checkboxVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    control: [
      "relative shrink-0 cursor-pointer",
      "size-checkbox",
      "rounded-checkbox border border-checkbox-border-base",
      "bg-checkbox-bg-base",
      "flex items-center justify-center",
      "transition-all duration-200 motion-reduce:transition-none",
      "data-[state=checked]:bg-checkbox-bg-checked",
      "data-[state=checked]:border-checkbox-border-checked",
      "data-[state=indeterminate]:bg-checkbox-bg-indeterminate",
      "data-[state=indeterminate]:border-checkbox-border-indeterminate",
      "data-disabled:cursor-not-allowed",
      "data-disabled:bg-checkbox-bg-disabled",
      "data-disabled:border-checkbox-border-disabled",
      "data-focus-visible:outline-(length:--default-ring-width) data-focus-visible:outline-(style:--default-ring-style)",
      "data-focus-visible:outline-checkbox-ring-focus",
      "data-focus-visible:outline-offset-(length:--default-ring-offset)",
      "data-invalid:border-(length:--border-width-validation)",
      "data-invalid:border-checkbox-border-error",
    ],
    hiddenInput: "sr-only",
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
    root: "flex items-center gap-form-checkbox-gap",
    textIndented: "data-[icon=false]:pl-form-checkbox-text-offset",
  },
  variants: {
    size: {
      lg: { label: "text-label-lg" },
      md: { label: "text-label-md" },
      sm: { label: "text-label-sm" },
    },
  },
})

export interface FormCheckboxProps {
  id?: string | undefined
  name?: string | undefined
  value?: string | undefined
  checked?: boolean | undefined
  defaultChecked?: boolean | undefined
  indeterminate?: boolean | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
  readOnly?: boolean | undefined
  children?: ReactNode | undefined
  label?: ReactNode | undefined
  helpText?: ReactNode | undefined
  validateStatus?: StatusTextProps["status"]
  showHelpTextIcon?: boolean | undefined
  size?: StatusTextProps["size"]
  className?: string | undefined
  onCheckedChange?: ((checked: boolean) => void) | undefined
}

export const FormCheckbox = ({
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
}: FormCheckboxProps) => {
  const generatedId = useId()
  const uniqueId = id === undefined || id === "" ? generatedId : id

  const resolvedChecked: CheckedState | undefined =
    indeterminate === true ? "indeterminate" : checked
  const service = useMachine(machine, {
    ...(resolvedChecked !== undefined && { checked: resolvedChecked }),
    ...(defaultChecked !== undefined && { defaultChecked }),
    disabled,
    id: uniqueId,
    invalid: validateStatus === "error",
    ...(name !== undefined && { name }),
    onCheckedChange: (details) => {
      onCheckedChange?.(details.checked === true)
    },
    readOnly,
    required,
    ...(value !== undefined && { value }),
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
        {Boolean(labelContent) && (
          <span className={styles.label()} {...api.getLabelProps()}>
            {labelContent}
            {required && <span className="text-label-fg-required"> *</span>}
          </span>
        )}
      </label>
      {Boolean(helpText) && (
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
