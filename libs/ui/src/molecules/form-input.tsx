import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
import { Input, type InputProps } from "../atoms/input"
import { Label } from "../atoms/label"
import { StatusText } from "../atoms/status-text"
import { tv } from "../utils"

const formInputVariants = tv({
  slots: {
    input: "p-input-sm md:p-input-md",
  },
})

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
  className,
  ...props
}: FormInputRawProps) {
  const { "aria-describedby": ariaDescribedBy, ...inputProps } = props
  const helpTextElement = isValidElement(helpText)
    ? (helpText as ReactElement<{ id?: string }>)
    : null
  const resolvedHelpTextId =
    helpTextElement?.props?.id ?? (helpText ? `${id}-helptext` : undefined)
  const mergedDescribedBy =
    [ariaDescribedBy, resolvedHelpTextId].filter(Boolean).join(" ") || undefined
  const { input } = formInputVariants()
  const inputClassName = input({ className })
  let helpTextContent: ReactNode = null

  if (helpText) {
    if (helpTextElement?.props.id) {
      helpTextContent = helpTextElement
    } else if (helpTextElement) {
      helpTextContent = cloneElement(helpTextElement, {
        id: resolvedHelpTextId,
      })
    } else {
      helpTextContent = <div id={resolvedHelpTextId}>{helpText}</div>
    }
  }

  return (
    <div className="flex flex-col gap-form-field-gap">
      <Label disabled={disabled} htmlFor={id} required={required} size={size}>
        {label}
      </Label>
      <Input
        aria-describedby={mergedDescribedBy}
        disabled={disabled}
        id={id}
        required={required}
        size={size}
        variant={validateStatus}
        {...inputProps}
        className={inputClassName}
      />

      {helpTextContent}
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
