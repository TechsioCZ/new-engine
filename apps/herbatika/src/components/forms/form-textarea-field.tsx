"use client";

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors";
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context";

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
  const field = useFieldContext<string>();
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false);
  const value = typeof field.state.value === "string" ? field.state.value : "";
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  });

  return (
    <FormTextarea
      helpText={fieldFeedback.errorText}
      id={id}
      label={label}
      name={field.name}
      onBlur={() => {
        field.handleBlur();
        setHasChangedSinceBlur(false);
      }}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (
          shouldTrackLiveFieldFeedback({
            meta: field.state.meta,
            submissionAttempts: field.form.state.submissionAttempts,
          })
        ) {
          setHasChangedSinceBlur(true);
        }
        field.handleChange(nextValue);
        onValueChange?.(nextValue);
      }}
      required={required}
      validateStatus={fieldFeedback.validateStatus}
      value={value}
      {...props}
    />
  );
}
