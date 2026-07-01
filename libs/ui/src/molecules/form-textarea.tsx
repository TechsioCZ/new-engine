import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
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
  const { "aria-describedby": ariaDescribedBy, ...textareaProps } = props
  const helpTextElement = isValidElement(helpText)
    ? (helpText as ReactElement<{ id?: string }>)
    : null
  const resolvedHelpTextId =
    helpTextElement?.props?.id ?? (helpText ? `${id}-helptext` : undefined)
  const mergedDescribedBy =
    [ariaDescribedBy, resolvedHelpTextId].filter(Boolean).join(" ") || undefined
  const helpTextContent = helpText ? (
    helpTextElement ? (
      helpTextElement.props.id ? (
        helpTextElement
      ) : (
        cloneElement(helpTextElement, {
          id: resolvedHelpTextId,
        })
      )
    ) : (
      <div id={resolvedHelpTextId}>{helpText}</div>
    )
  ) : null
  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={disabled} htmlFor={id} required={required} size={size}>
        {label}
      </Label>
      <Textarea
        aria-describedby={mergedDescribedBy}
        disabled={disabled}
        id={id}
        required={required}
        size={size}
        variant={validateStatus}
        {...textareaProps}
      />

      {helpTextContent}
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
      {...props}
    />
  )
}
