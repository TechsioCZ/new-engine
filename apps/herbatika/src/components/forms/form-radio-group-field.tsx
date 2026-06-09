"use client";

import type { ReactNode } from "react";
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group";
import { resolveVisibleFieldFeedback } from "@/lib/forms/core/field-errors";
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context";

type RadioGroupItem = {
  description?: ReactNode;
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

type FormRadioGroupFieldProps = {
  id: string;
  items: RadioGroupItem[];
  label: ReactNode;
  orientation?: "horizontal" | "vertical";
  required?: boolean;
  size?: "sm" | "md" | "lg";
  validationMode?: "none" | "blur";
  variant?: "outline" | "solid" | "subtle";
  onValueChange?: (value: string) => void;
};

export function FormRadioGroupField({
  id,
  items,
  label,
  onValueChange,
  orientation = "vertical",
  required = false,
  size = "md",
  validationMode = "blur",
  variant = "outline",
}: FormRadioGroupFieldProps) {
  const field = useFieldContext<string>();
  const value = typeof field.state.value === "string" ? field.state.value : "";
  const fieldFeedback = resolveVisibleFieldFeedback({
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  });

  return (
    <RadioGroup
      id={id}
      name={field.name}
      onValueChange={(nextValue) => {
        const normalizedValue = nextValue ?? "";
        field.handleChange(normalizedValue);
        field.handleBlur();
        onValueChange?.(normalizedValue);
      }}
      orientation={orientation}
      required={required}
      size={size}
      validateStatus={fieldFeedback.validateStatus}
      value={value || null}
      variant={variant}
    >
      <RadioGroup.Label>{label}</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        {items.map((item) => (
          <RadioGroup.Item
            disabled={item.disabled}
            key={item.value}
            value={item.value}
          >
            <RadioGroup.ItemHiddenInput />
            <RadioGroup.ItemControl />
            <RadioGroup.ItemContent>
              <RadioGroup.ItemText>{item.label}</RadioGroup.ItemText>
              {item.description ? (
                <RadioGroup.ItemDescription>
                  {item.description}
                </RadioGroup.ItemDescription>
              ) : null}
            </RadioGroup.ItemContent>
          </RadioGroup.Item>
        ))}
      </RadioGroup.ItemGroup>
      {fieldFeedback.errorText ? (
        <RadioGroup.StatusText>{fieldFeedback.errorText}</RadioGroup.StatusText>
      ) : null}
    </RadioGroup>
  );
}
