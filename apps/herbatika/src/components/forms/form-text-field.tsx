"use client"

import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { type ReactNode, useState } from "react"
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"

type FormTextFieldProps = {
  id: string
  label?: ReactNode
  type?: "text" | "email" | "password" | "tel"
  autoComplete?: string
  required?: boolean
  validationMode?: "none" | "blur"
  externalError?: string | null
  onValueChange?: (value: string) => void
}

export function FormTextField({
  id,
  label,
  type = "text",
  autoComplete,
  required = false,
  validationMode = "blur",
  externalError,
  onValueChange,
}: FormTextFieldProps) {
  const field = useFieldContext<string>()
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false)
  const value = typeof field.state.value === "string" ? field.state.value : ""
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  })
  const errorText = externalError ?? fieldFeedback.errorText
  const validateStatus = externalError ? "error" : fieldFeedback.validateStatus

  return (
    <FormInput
      autoComplete={autoComplete}
      helpText={errorText}
      id={id}
      label={label}
      name={field.name}
      onBlur={() => {
        field.handleBlur()
        setHasChangedSinceBlur(false)
      }}
      onChange={(event) => {
        const nextValue = event.target.value
        if (
          shouldTrackLiveFieldFeedback({
            meta: field.state.meta,
            submissionAttempts: field.form.state.submissionAttempts,
          })
        ) {
          setHasChangedSinceBlur(true)
        }
        field.handleChange(nextValue)
        onValueChange?.(nextValue)
      }}
      required={required}
      type={type}
      validateStatus={validateStatus}
      value={value}
    />
  )
}
