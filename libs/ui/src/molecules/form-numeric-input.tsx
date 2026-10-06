/**
 * FormNumericInput — @techsio/ui-kit molecule.
 *
 * @component FormNumericInput
 * @componentVersion v1.0.1
 * @skill form-numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ReactNode } from "react"
import { Label } from "../atoms/label"
import { NumericInput, type NumericInputProps } from "../atoms/numeric-input"
import { StatusText } from "../atoms/status-text"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormNumericInputProps extends Omit<NumericInputProps, "children"> {
  id: string
  label: ReactNode
  validateStatus?: ValidateStatus
  helpText?: ReactNode
  showHelpTextIcon?: boolean
  children: ReactNode
}

export function FormNumericInput({
  id,
  ids,
  label,
  validateStatus = "default",
  helpText,
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  required,
  disabled,
  describedBy,
  children,
  ...numericInputProps
}: FormNumericInputProps) {
  const inputId = ids?.input ?? id
  const helpTextId = helpText ? `${id}-help` : undefined
  const inputDescribedBy =
    [describedBy, helpTextId].filter(Boolean).join(" ") || undefined

  return (
    <div
      className="flex flex-col gap-form-field-gap"
    >
      <Label disabled={disabled} htmlFor={inputId} required={required} size={size}>
        {label}
      </Label>

      <NumericInput
        describedBy={inputDescribedBy}
        disabled={disabled}
        id={id}
        ids={ids}
        invalid={validateStatus === "error"}
        required={required}
        size={size}
        {...numericInputProps}
      >
        {children}
      </NumericInput>

      {helpText && (
        <StatusText
          id={helpTextId}
          status={validateStatus}
          showIcon={showHelpTextIcon}
          size={size}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
