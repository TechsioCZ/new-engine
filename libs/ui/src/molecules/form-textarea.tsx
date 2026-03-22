import type { ReactNode } from "react"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { Textarea, type TextareaProps } from "../atoms/textarea"

type ValidateStatus = "default" | "error" | "success" | "warning"

interface FormTextareaRawProps extends TextareaProps {
  id: string
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
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={disabled} htmlFor={id} required={required} size={size}>
        {label}
      </Label>
      <Textarea
        disabled={disabled}
        id={id}
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
  ...props
}: FormTextareaProps) {
  return (
    <FormTextareaRaw
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
