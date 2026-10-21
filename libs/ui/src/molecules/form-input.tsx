/**
 * FormInput — @techsio/ui-kit molecule.
 *
 * @component FormInput
 * @componentVersion v1.1.4
 * @skill form-input-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the form-input-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { cloneElement, isValidElement, type ReactNode, useId } from "react"
import { Input, type InputProps } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText, type StatusTextProps } from "../atoms/status-text"
import { joinDescribedBy } from "../internal/described-by"

type ValidateStatus = "default" | "error" | "success" | "warning"

type FormInputProps = InputProps & {
  /** Links the label to the control; generated when omitted or empty. */
  id?: string
  label: ReactNode
  validateStatus?: ValidateStatus
  helpText?: ReactNode
  /** Validation state icons always remain enabled. */
  showHelpTextIcon?: boolean
}

// The legacy Raw export accepts precomposed StatusText as well as plain copy.
// Both entry points keep the same label and feedback accessibility guarantees.
export function FormInputRaw({
  id,
  label,
  validateStatus = "default",
  helpText,
  showHelpTextIcon,
  size = "md",
  required,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-errormessage": ariaErrorMessage,
  ...props
}: FormInputProps) {
  const generatedId = useId()
  const generatedMessageId = useId()
  const controlId = id || generatedId
  const hasHelpText =
    helpText !== undefined &&
    helpText !== null &&
    helpText !== false &&
    helpText !== ""
  const suppliedMessage =
    isValidElement<StatusTextProps>(helpText) && helpText.type === StatusText
      ? helpText
      : undefined
  const messageId = suppliedMessage?.props.id || generatedMessageId
  const status =
    validateStatus === "default"
      ? (suppliedMessage?.props.status ?? validateStatus)
      : validateStatus
  const invalid = status === "error"
  const messageProps = {
    id: messageId,
    status,
    size,
    showIcon: status !== "default" || showHelpTextIcon,
  }

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
        {...props}
        aria-describedby={joinDescribedBy(
          ariaDescribedBy,
          hasHelpText ? messageId : undefined
        )}
        aria-errormessage={joinDescribedBy(
          ariaErrorMessage,
          invalid && hasHelpText ? messageId : undefined
        )}
        aria-invalid={invalid ? true : ariaInvalid}
        disabled={disabled}
        id={controlId}
        required={required}
        size={size}
        variant={status === "default" ? props.variant : status}
      />
      {hasHelpText &&
        (suppliedMessage ? (
          cloneElement(suppliedMessage, messageProps)
        ) : (
          <StatusText {...messageProps}>{helpText}</StatusText>
        ))}
    </div>
  )
}

export function FormInput(props: FormInputProps) {
  return <FormInputRaw {...props} />
}
