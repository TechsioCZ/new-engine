"use client";

import { createFormHook } from "@tanstack/react-form";
import { FormCheckboxField } from "@/components/forms/form-checkbox-field";
import { FormRadioGroupField } from "@/components/forms/form-radio-group-field";
import { FormSelectField } from "@/components/forms/form-select-field";
import { FormTextField } from "@/components/forms/form-text-field";
import { FormTextareaField } from "@/components/forms/form-textarea-field";
import {
  fieldContext,
  formContext,
} from "@/lib/forms/core/herbatika-form-context";

export const {
  useAppForm: useHerbatikaForm,
  withFieldGroup: withHerbatikaFieldGroup,
  withForm: withHerbatikaForm,
} = createFormHook({
  fieldComponents: {
    CheckboxField: FormCheckboxField,
    RadioGroupField: FormRadioGroupField,
    SelectField: FormSelectField,
    TextField: FormTextField,
    TextareaField: FormTextareaField,
  },
  fieldContext,
  formComponents: {},
  formContext,
});
