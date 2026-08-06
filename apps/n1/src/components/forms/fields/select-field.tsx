"use client"

import { Select } from "@techsio/ui-kit/molecules/select"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"

import type { FieldApiCompat } from "@/types/form"

interface SelectOption extends SelectItem {
  value: string
  label: string
}

interface SelectFieldProps<TValue> {
  field: FieldApiCompat<TValue, string>
  label: string
  options: SelectOption[]
  required?: boolean
  disabled?: boolean | undefined
  placeholder?: string
  className?: string
}

export const SelectField = <TValue,>({
  field,
  label,
  options,
  required,
  disabled,
  placeholder,
  className,
}: SelectFieldProps<TValue>) => {
  const { errors } = field.state.meta
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
    const [value] = details.value
    if (typeof value === "string" && value.length > 0) {
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
