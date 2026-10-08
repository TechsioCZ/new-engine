/**
 * FormTextarea — @techsio/ui-kit molecule.
 *
 * @component FormTextarea
 * @componentVersion v1.1.1
 * @skill form-textarea-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-textarea-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { type ReactNode, useId } from "react"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { Textarea, type TextareaProps } from "../atoms/textarea"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormTextareaRawProps extends TextareaProps {
  /** Links the label to the control; generated when omitted or empty. */
  id?: string
  label: ReactNode
  validateStatus?: ValidateStatus
  helpText?: ReactNode
}

export function FormTextareaRaw({
  id,
  label,
  validateStatus = "default",
  helpText,
  size = "md",
  required,
  disabled,
  ...props
}: FormTextareaRawProps) {
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
      <Textarea
        disabled={disabled}
        id={controlId}
        required={required}
        size={size}
        variant={validateStatus}
        {...props}
      />

      {helpText}
    </div>
  )
}

type FormTextareaProps = FormTextareaRawProps & {
  showHelpTextIcon?: boolean
}

export function FormTextarea({
  helpText,
  id,
  validateStatus = "default",
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: FormTextareaProps) {
  const helpTextId = useId()
  const describedBy =
    [ariaDescribedBy, helpText ? helpTextId : undefined]
      .filter(Boolean)
      .join(" ") || undefined

  return (
    <FormTextareaRaw
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
