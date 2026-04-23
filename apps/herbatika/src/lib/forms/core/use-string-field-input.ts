"use client";

import { useState } from "react";
import {
  resolveVisibleFieldFeedback,
  shouldTrackLiveFieldFeedback,
} from "@/lib/forms/core/field-errors";
import { useFieldContext } from "@/lib/forms/core/herbatika-form-context";

type UseStringFieldInputOptions = {
  validationMode?: "none" | "blur";
};

export function useStringFieldInput({
  validationMode = "blur",
}: UseStringFieldInputOptions = {}) {
  const field = useFieldContext<string>();
  const [hasChangedSinceBlur, setHasChangedSinceBlur] = useState(false);
  const value = typeof field.state.value === "string" ? field.state.value : "";
  const fieldFeedback = resolveVisibleFieldFeedback({
    hasChangedSinceBlur,
    meta: field.state.meta,
    submissionAttempts: field.form.state.submissionAttempts,
    validationMode,
  });

  const handleBlur = () => {
    field.handleBlur();
    setHasChangedSinceBlur(false);
  };

  const handleValueChange = (nextValue: string) => {
    if (
      shouldTrackLiveFieldFeedback({
        meta: field.state.meta,
        submissionAttempts: field.form.state.submissionAttempts,
      })
    ) {
      setHasChangedSinceBlur(true);
    }

    field.handleChange(nextValue);
  };

  return {
    field,
    fieldFeedback,
    handleBlur,
    handleValueChange,
    value,
  };
}
