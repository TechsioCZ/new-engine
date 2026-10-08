/**
 * FormInput — @techsio/ui-kit molecule.
 *
 * @component FormInput
 * @componentVersion v1.1.1
 * @skill form-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { type ReactNode, useId } from "react"
import { Input, type InputProps } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormInputRawProps extends InputProps {
  /** Links the label to the control; generated when omitted or empty. */
  id?: string
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
  // An empty or missing id would leave the label pointing at nothing.
  const generatedId = useId()
  const controlId = id || generatedId

  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label
        disabled={disabled}
        htmlFor={controlId}
        required={required}
        size={size}
      >
        {label}
      </Label>
      <Input
        disabled={disabled}
        id={controlId}
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
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: FormInputProps) {
  const helpTextId = useId()
  const describedBy =
    [ariaDescribedBy, helpText ? helpTextId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <FormInputRaw
      aria-describedby={describedBy}
      aria-invalid={validateStatus === "error" ? true : ariaInvalid}
      helpText={
        helpText && (
          <StatusText
            id={helpTextId}
            showIcon={showHelpTextIcon}
            size={size}
            status={validateStatus}
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
