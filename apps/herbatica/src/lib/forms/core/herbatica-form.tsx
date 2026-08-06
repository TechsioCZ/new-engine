"use client"

import { createFormHook } from "@tanstack/react-form"
import { FormCheckboxField } from "@/components/forms/form-checkbox-field"
import { FormPhoneField } from "@/components/forms/form-phone-field"
import { FormRadioGroupField } from "@/components/forms/form-radio-group-field"
import { FormSelectField } from "@/components/forms/form-select-field"
import { FormTextField } from "@/components/forms/form-text-field"
import { FormTextareaField } from "@/components/forms/form-textarea-field"
import {
  fieldContext,
  formContext,
} from "@/lib/forms/core/herbatica-form-context"

export const {
  useAppForm: useHerbaticaForm,
  withFieldGroup: withHerbaticaFieldGroup,
  withForm: withHerbaticaForm,
} = createFormHook({
  fieldComponents: {
    CheckboxField: FormCheckboxField,
    PhoneField: FormPhoneField,
    RadioGroupField: FormRadioGroupField,
    SelectField: FormSelectField,
    TextField: FormTextField,
    TextareaField: FormTextareaField,
  },
  fieldContext,
  formComponents: {},
  formContext,
})
