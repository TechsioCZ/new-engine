/*
 * FormNumericInput — @techsio/ui-kit molecule.
 *
 * @component FormNumericInput
 * @componentVersion v1.0.2
 * @skill form-numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ReactNode } from "react"

import { Label } from "../atoms/label"
import { NumericInput } from "../atoms/numeric-input"
import type { NumericInputProps } from "../atoms/numeric-input"
import { StatusText } from "../atoms/status-text"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormNumericInputProps extends Omit<NumericInputProps, "children"> {
  id: string
  label: ReactNode
  validateStatus?: ValidateStatus | undefined
  helpText?: ReactNode | undefined
  showHelpTextIcon?: boolean | undefined
  children: ReactNode
}

export const FormNumericInput = ({
  id,
  label,
  validateStatus = "default",
  helpText,
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  required,
  disabled,
  children,
  ...numericInputProps
}: FormNumericInputProps) => {
  const hasHelpText = Boolean(helpText)

  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={disabled} htmlFor={id} required={required} size={size}>
        {label}
      </Label>

      <NumericInput
        disabled={disabled}
        id={id}
        invalid={validateStatus === "error"}
        required={required}
        size={size}
        {...numericInputProps}
      >
        {children}
      </NumericInput>

      {hasHelpText ? (
        <StatusText
          status={validateStatus}
          showIcon={showHelpTextIcon}
          size={size}
        >
          {helpText}
        </StatusText>
      ) : (
        helpText
      )}
    </div>
  )
}
