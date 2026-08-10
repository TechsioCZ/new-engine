import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from "@tanstack/react-form"

import type { RegisterFormValues } from "@/lib/auth/auth-form-validators"
import type { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"

type RegisterFormValidate = FormValidateOrFn<RegisterFormValues> | undefined
type RegisterFormAsyncValidate =
  | FormAsyncValidateOrFn<RegisterFormValues>
  | undefined

type UseRegisterForm = typeof useHerbatikaForm<
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
  unknown
>

export type RegisterFormController = ReturnType<UseRegisterForm>
export type RegisterFieldChangeHandler = () => void
