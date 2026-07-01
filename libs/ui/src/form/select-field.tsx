import type { AnyFieldApi } from "@tanstack/react-form"
import type { ReactNode } from "react"
import { Select, type SelectItem, type SelectSize } from "../molecules/select"
import { getFieldStatus, getSelectFieldProps } from "./field-bindings"

export type SelectFieldProps = {
  field: AnyFieldApi
  label: ReactNode
  options: SelectItem[]
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
  size?: SelectSize
  externalError?: string
  onExternalErrorClear?: () => void
  helpText?: ReactNode
  showHelpTextIcon?: boolean
}

export function SelectField({
  field,
  label,
  options,
  required,
  disabled,
  placeholder,
  className,
  size = "lg",
  externalError,
  onExternalErrorClear,
  helpText,
  showHelpTextIcon,
}: SelectFieldProps) {
  const fieldProps = getSelectFieldProps(field)
  const fieldStatus = getFieldStatus(field, {
    when: "blurred",
    externalError,
  })
  const resolvedHelpText = fieldStatus.errorMessage ?? helpText
  const helpTextId = resolvedHelpText ? `${fieldProps.id}-helptext` : undefined

  const handleValueChange = (details: { value: string[] }) => {
    fieldProps.onValueChange(details)
    if (externalError && onExternalErrorClear) {
      onExternalErrorClear()
    }
  }

  return (
    <Select
      className={className}
      disabled={disabled}
      id={fieldProps.id}
      items={options}
      name={fieldProps.name}
      onValueChange={handleValueChange}
      required={required}
      size={size}
      validateStatus={fieldStatus.validateStatus}
      value={fieldProps.value}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger
          aria-describedby={helpTextId}
          aria-invalid={fieldStatus["aria-invalid"]}
        >
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {options.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
      {resolvedHelpText && (
        <Select.StatusText
          id={helpTextId}
          showIcon={showHelpTextIcon}
          status={fieldStatus.errorMessage ? "error" : "default"}
        >
          {resolvedHelpText}
        </Select.StatusText>
      )}
    </Select>
  )
}
