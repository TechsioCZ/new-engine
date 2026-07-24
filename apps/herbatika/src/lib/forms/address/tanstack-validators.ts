import { createChangeBlurSubmitContextualFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import { validateRequiredPhoneNumberForSupportedCountries } from "./phone"
import { validatePostalCodeForCountry } from "./postal-code"

export type AddressCountryCodeSelector<TFormValues> = (
  values: TFormValues
) => string | null | undefined

export type AddressValidationPredicate<TFormValues> = (
  values: TFormValues
) => boolean

type CountryAwareFieldValidatorOptions<TFormValues, TListenTo extends string> =
  {
    countryFieldName: TListenTo
    getCountryCode: AddressCountryCodeSelector<TFormValues>
    shouldValidate?: AddressValidationPredicate<TFormValues>
  }

export const validateRequiredPostalCodeWithCountry = <TFormValues>({
  getCountryCode,
  value,
  values,
}: {
  getCountryCode: AddressCountryCodeSelector<TFormValues>
  value: string
  values: TFormValues
}) => {
  const result = validatePostalCodeForCountry(value, getCountryCode(values))

  return result.valid ? undefined : result.message
}

export const validateRequiredPhoneNumberWithSupportedCountries = <TFormValues>({
  getCountryCode,
  value,
  values,
}: {
  getCountryCode: AddressCountryCodeSelector<TFormValues>
  value: string
  values: TFormValues
}) => {
  const result = validateRequiredPhoneNumberForSupportedCountries(
    value,
    getCountryCode(values)
  )

  return result.valid ? undefined : result.message
}

export const createCountryAwarePostalCodeFieldValidators = <
  TFormValues,
  TListenTo extends string,
>({
  countryFieldName,
  getCountryCode,
  shouldValidate,
}: CountryAwareFieldValidatorOptions<TFormValues, TListenTo>) =>
  createChangeBlurSubmitContextualFieldValidators<
    string,
    TFormValues,
    TListenTo
  >(
    ({ value, values }) =>
      validateRequiredPostalCodeWithCountry({
        getCountryCode,
        value,
        values,
      }),
    {
      onBlurListenTo: [countryFieldName],
      onChangeListenTo: [countryFieldName],
      shouldValidate,
    }
  )

export const createRequiredPhoneNumberFieldValidators = <
  TFormValues,
  TListenTo extends string,
>({
  countryFieldName,
  getCountryCode,
  shouldValidate,
}: CountryAwareFieldValidatorOptions<TFormValues, TListenTo>) =>
  createChangeBlurSubmitContextualFieldValidators<
    string,
    TFormValues,
    TListenTo
  >(
    ({ value, values }) =>
      validateRequiredPhoneNumberWithSupportedCountries({
        getCountryCode,
        value,
        values,
      }),
    {
      onBlurListenTo: [countryFieldName],
      onChangeListenTo: [countryFieldName],
      shouldValidate,
    }
  )
