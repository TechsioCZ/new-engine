"use client";

import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import type { ReactNode } from "react";
import { useStringFieldInput } from "@/lib/forms/core/use-string-field-input";

type FormTextFieldProps = {
  id: string;
  label: ReactNode;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  required?: boolean;
  validationMode?: "none" | "blur";
  externalError?: string | null;
  onValueChange?: (value: string) => void;
};

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
  const { field, fieldFeedback, handleBlur, handleValueChange, value } =
    useStringFieldInput({ validationMode });
  const errorText = externalError ?? fieldFeedback.errorText;
  const validateStatus = externalError ? "error" : fieldFeedback.validateStatus;

  return (
    <FormInput
      autoComplete={autoComplete}
      helpText={errorText}
      id={id}
      label={label}
      name={field.name}
      onBlur={handleBlur}
      onChange={(event) => {
        const nextValue = event.target.value;
        handleValueChange(nextValue);
        onValueChange?.(nextValue);
      }}
      required={required}
      type={type}
      validateStatus={validateStatus}
      value={value}
    />
  );
}
