"use client"

import {
  Select,
  type SelectItem,
  type SelectSize,
} from "@techsio/ui-kit/molecules/select"
import type { ReactNode } from "react"
import { resolveVisibleFieldFeedback } from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"

type FormSelectFieldProps = {
  id: string
  items: SelectItem[]
  label: ReactNode
  autoComplete?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  size?: SelectSize
  validationMode?: "none" | "blur"
  onValueChange?: (value: string) => void
}

export function FormSelectField({
  disabled = false,
  id,
  items,
  label,
  autoComplete,
  onValueChange,
  placeholder,
  required = false,
  size = "md",
  validationMode = "blur",
}: FormSelectFieldProps) {
  const field = useFieldContext<string>()
  const value = typeof field.state.value === "string" ? field.state.value : ""
  const fieldFeedback = resolveVisibleFieldFeedback({
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  })

  return (
    <Select
      disabled={disabled}
      autoComplete={autoComplete}
      id={id}
      items={items}
      name={field.name}
      onValueChange={(details) => {
        const nextValue = details.value[0] ?? ""
        field.handleChange(nextValue)
        field.handleBlur()
        onValueChange?.(nextValue)
      }}
      required={required}
      size={size}
      validateStatus={fieldFeedback.validateStatus}
      value={value ? [value] : []}
    >
      <Select.Label>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText placeholder={placeholder} />
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content>
          {items.map((item) => (
            <Select.Item item={item} key={item.value}>
              <Select.ItemText />
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
      {fieldFeedback.errorText ? (
        <Select.StatusText>{fieldFeedback.errorText}</Select.StatusText>
      ) : null}
    </Select>
  )
}
