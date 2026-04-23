"use client";

import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useStringFieldInput } from "@/lib/forms/core/use-string-field-input";

type FormTextareaFieldProps = {
  id: string;
  label: ReactNode;
  required?: boolean;
  validationMode?: "none" | "blur";
  onValueChange?: (value: string) => void;
} & Omit<
  ComponentPropsWithoutRef<typeof FormTextarea>,
  | "helpText"
  | "id"
  | "label"
  | "name"
  | "onBlur"
  | "onChange"
  | "required"
  | "validateStatus"
  | "value"
>;

export function FormTextareaField({
  id,
  label,
  onValueChange,
  required = false,
  validationMode = "blur",
  ...props
}: FormTextareaFieldProps) {
  const { field, fieldFeedback, handleBlur, handleValueChange, value } =
    useStringFieldInput({ validationMode });

  return (
    <FormTextarea
      helpText={fieldFeedback.errorText}
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
      validateStatus={fieldFeedback.validateStatus}
      value={value}
      {...props}
    />
  );
}
