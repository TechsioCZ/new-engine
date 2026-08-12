/**
 * FormInput — @techsio/ui-kit molecule.
 *
 * @component FormInput
 * @componentVersion v1.0.0
 * @skill form-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ReactNode } from "react"
import { Input, type InputProps } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormInputRawProps extends InputProps {
  id: string
  label: ReactNode
  validateStatus?: ValidateStatus
  helpText?: ReactNode
}

export function FormInputRaw({
  id,
  label,
  validateStatus = "default",
  helpText,
  size = "md",
  required,
  disabled,
  ...props
}: FormInputRawProps) {
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={disabled} htmlFor={id} required={required} size={size}>
        {label}
      </Label>
      <Input
        disabled={disabled}
        id={id}
        required={required}
        size={size}
        variant={validateStatus}
        {...props}
        className="p-input-sm md:p-input-md"
      />

      {helpText}
    </div>
  )
}

type FormInputProps = FormInputRawProps & {
  showHelpTextIcon?: boolean
}

export function FormInput({
  helpText,
  id,
  validateStatus = "default",
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  ...props
}: FormInputProps) {
  return (
    <FormInputRaw
      helpText={
        helpText && (
          <StatusText
            status={validateStatus}
            showIcon={showHelpTextIcon}
            size={size}
          >
            {helpText}
          </StatusText>
        )
      }
      id={id}
      size={size}
      validateStatus={validateStatus}
      {...props}
    />
  )
}
