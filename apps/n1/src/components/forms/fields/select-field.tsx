"use client"

import { Select } from "@techsio/ui-kit/molecules/select"
import type { AnyFieldApiCompat } from "@/types/form"

type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  field: AnyFieldApiCompat
  label: string
  options: SelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function SelectField({
  field,
  label,
  options,
  required,
  disabled,
  placeholder,
  className,
}: SelectFieldProps) {
  const errors = field.state.meta.errors
  const showErrors = field.state.meta.isBlurred && errors.length > 0
  const validateStatus = showErrors ? "error" : "default"
  const selectedValue =
    typeof field.state.value === "string" ? field.state.value : ""
  const errorMessage = showErrors ? errors[0] : undefined
  const errorText =
    typeof errorMessage === "string" || typeof errorMessage === "number"
      ? String(errorMessage)
      : undefined

  const handleValueChange = (details: { value: string[] }) => {
    const value = details.value[0]
    if (value) {
      field.handleChange(value)
      if (!field.state.meta.isTouched) {
        field.handleBlur()
      }
    }
  }

  return (
    <Select
      className={className}
      disabled={disabled}
      id={field.name}
      items={options}
      onValueChange={handleValueChange}
      required={required}
      size="lg"
      validateStatus={validateStatus}
      value={[selectedValue]}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger>
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
      {showErrors && <Select.StatusText>{errorText}</Select.StatusText>}
    </Select>
  )
}
