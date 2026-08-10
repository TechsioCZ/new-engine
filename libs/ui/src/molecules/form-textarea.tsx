/*
 * FormTextarea — @techsio/ui-kit molecule.
 *
 * @component FormTextarea
 * @componentVersion v1.0.1
 * @skill form-textarea-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-textarea-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { ReactNode } from "react"

import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import type { StatusTextProps } from "../atoms/status-text"
import { Textarea } from "../atoms/textarea"
import type { TextareaProps } from "../atoms/textarea"

type ValidateStatus = StatusTextProps["status"]

interface FormTextareaRawProps extends TextareaProps {
  id: string
  label: ReactNode
  validateStatus?: ValidateStatus | undefined
  helpText?: ReactNode | undefined
}

export const FormTextareaRaw = ({
  id,
  label,
  validateStatus = "default",
  helpText,
  size = "md",
  required,
  disabled,
  ...props
}: FormTextareaRawProps) => (
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

type FormTextareaProps = FormTextareaRawProps & {
  showHelpTextIcon?: boolean | undefined
}

export const FormTextarea = ({
  helpText,
  id,
  validateStatus = "default",
  showHelpTextIcon = validateStatus !== "default",
  size = "md",
  ...props
}: FormTextareaProps) => {
  const hasHelpText = Boolean(helpText)

  return (
    <FormTextareaRaw
      helpText={
        hasHelpText ? (
          <StatusText
            showIcon={showHelpTextIcon}
            size={size}
            status={validateStatus}
          >
            {helpText}
          </StatusText>
        ) : (
          helpText
        )
      }
      id={id}
      size={size}
      validateStatus={validateStatus}
      {...props}
    />
  )
}
