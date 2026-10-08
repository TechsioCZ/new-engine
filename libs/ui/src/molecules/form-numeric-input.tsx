/**
 * FormNumericInput — @techsio/ui-kit molecule.
 *
 * @component FormNumericInput
 * @componentVersion v1.1.1
 * @skill form-numeric-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-numeric-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { type ReactNode, useId } from "react"
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
  label,
  validateStatus = "default",
  helpText,
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  required,
  disabled,
  children,
  describedBy,
  ...numericInputProps
}: FormNumericInputProps) {
  const generatedId = useId()
  // The label must point at the real input. Zag only uses our id for the
  // input when one is given, otherwise it generates `number-input:<id>:input`
  // and the label's htmlFor dangles — so always pass a concrete id.
  const inputId = id || generatedId
  const helpTextId = useId()
  const mergedDescribedBy =
    [describedBy, helpText ? helpTextId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label
        disabled={disabled}
        htmlFor={inputId}
        required={required}
        size={size}
      >
        {label}
      </Label>

      <NumericInput
        describedBy={mergedDescribedBy}
        disabled={disabled}
        id={inputId}
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
          showIcon={showHelpTextIcon}
          size={size}
          status={validateStatus}
        >
          {helpText}
        </StatusText>
      )}
    </div>
  )
}
