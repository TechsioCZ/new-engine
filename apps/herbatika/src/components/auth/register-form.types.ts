import type {
  AppFieldExtendedReactFormApi,
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from "@tanstack/react-form"
import type { FormCheckboxField } from "@/components/forms/form-checkbox-field"
import type { FormPhoneField } from "@/components/forms/form-phone-field"
import type { FormRadioGroupField } from "@/components/forms/form-radio-group-field"
import type { FormSelectField } from "@/components/forms/form-select-field"
import type { FormTextField } from "@/components/forms/form-text-field"
import type { FormTextareaField } from "@/components/forms/form-textarea-field"
import type { RegisterFormValues } from "@/lib/auth/auth-form-validators"

type RegisterFormValidate = FormValidateOrFn<RegisterFormValues> | undefined
type RegisterFormAsyncValidate =
  | FormAsyncValidateOrFn<RegisterFormValues>
  | undefined

type HerbatikaFieldComponents = {
  CheckboxField: typeof FormCheckboxField
  PhoneField: typeof FormPhoneField
  RadioGroupField: typeof FormRadioGroupField
  SelectField: typeof FormSelectField
  TextField: typeof FormTextField
  TextareaField: typeof FormTextareaField
}

export type RegisterFormController = AppFieldExtendedReactFormApi<
  RegisterFormValues,
  RegisterFormValidate,
  RegisterFormValidate,
  RegisterFormAsyncValidate,
  RegisterFormValidate,
  RegisterFormAsyncValidate,
  RegisterFormValidate,
  RegisterFormAsyncValidate,
  RegisterFormValidate,
  RegisterFormAsyncValidate,
  RegisterFormAsyncValidate,
  unknown,
  HerbatikaFieldComponents,
  Record<never, never>
>
export type RegisterFieldChangeHandler = () => void
