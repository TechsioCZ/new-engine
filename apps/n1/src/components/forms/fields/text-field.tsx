"use client"

import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import type { ChangeEvent, InputHTMLAttributes } from "react"

import type { AnyFieldApiCompat } from "@/types/form"

type TextFieldProps = {
  field: AnyFieldApiCompat
  label: string
  type?: InputHTMLAttributes<HTMLInputElement>["type"]
  placeholder?: string
  required?: boolean
  disabled?: boolean | undefined
  transform?: (value: string) => string
  className?: string
  autoComplete?: string
  maxLength?: number
  externalError?: string | undefined
  onExternalErrorClear?: () => void
}

export function TextField({
  field,
  label,
  type = "text",
  placeholder,
  required,
  disabled,
  transform,
  autoComplete,
  maxLength,
  externalError,
  onExternalErrorClear,
}: TextFieldProps) {
  const fieldErrors = field.state.meta.errors
  const showFieldErrors = field.state.meta.isBlurred && fieldErrors.length > 0

  const fieldValue =
    typeof field.state.value === "string" ||
    typeof field.state.value === "number"
      ? field.state.value
      : ""

  const errorId = `${field.name}-error`
  const showError = !!externalError || showFieldErrors
  const errorMessage = externalError || fieldErrors[0]
  const errorText =
    typeof errorMessage === "string" || typeof errorMessage === "number"
      ? String(errorMessage)
      : undefined

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = transform ? transform(e.target.value) : e.target.value
    field.handleChange(value)

    // Clear external error when user starts typing
    if (externalError && onExternalErrorClear) {
      onExternalErrorClear()
    }
  }

  return (
    <FormInput
      aria-describedby={showError ? errorId : undefined}
      aria-invalid={showError}
      autoComplete={autoComplete}
      disabled={disabled}
      helpText={showError ? errorText : undefined}
      id={field.name}
      label={label}
      maxLength={maxLength}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={handleChange}
      placeholder={placeholder}
      required={required}
      type={type}
      validateStatus={showError ? "error" : "default"}
      value={fieldValue}
      variant={showError ? "error" : "default"}
    />
  )
}
