"use client"

import { useStore } from "@tanstack/react-form"
import { FormCheckbox } from "@techsio/ui-kit/molecules/form-checkbox"
import type { ReactNode } from "react"
import { resolveVisibleFieldFeedback } from "@/lib/forms/core/field-errors"
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context"

type FormCheckboxFieldProps = {
  id: string
  label: ReactNode
  required?: boolean
  size?: "sm" | "md" | "lg"
  validationMode?: "none" | "blur"
  onValueChange?: (checked: boolean) => void
}

export function FormCheckboxField({
  id,
  label,
  required = false,
  size = "md",
  validationMode = "blur",
  onValueChange,
}: FormCheckboxFieldProps) {
  const field = useFieldContext<boolean>()
  const submissionAttempts = useStore(
    field.form.store,
    (state) => state.submissionAttempts
  )
  const fieldFeedback = resolveVisibleFieldFeedback({
    meta: field.state.meta,
    submissionAttempts,
    validationMode,
  })

  return (
    <FormCheckbox
      checked={Boolean(field.state.value)}
      helpText={fieldFeedback.errorText}
      id={id}
      label={label}
      onCheckedChange={(checked) => {
        field.handleChange(checked)
        field.handleBlur()
        onValueChange?.(checked)
      }}
      required={required}
      showHelpTextIcon
      size={size}
      validateStatus={fieldFeedback.validateStatus}
    />
  )
}
