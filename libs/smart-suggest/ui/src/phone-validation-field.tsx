import type {
  PhoneValidationPolicy,
  PhoneValidationResult,
} from "@techsio/smart-suggest-validation"
import { validatePhoneNumber } from "@techsio/smart-suggest-validation"
import {
  PhoneInput,
  type PhoneInputCountryChangeDetails,
  type PhoneInputProps,
  type PhoneInputValidateStatus,
  type PhoneInputValueChangeDetails,
} from "@techsio/ui-kit/molecules/phone-input"
import { type ReactNode, useMemo, useState } from "react"

export type PhoneValidationFieldProps = Omit<
  PhoneInputProps,
  "children" | "onCountryChange" | "onValueChange" | "validateStatus"
> &
  PhoneValidationPolicy & {
    label: ReactNode
    helpText?: ReactNode
    onCountryChange?: (details: PhoneInputCountryChangeDetails) => void
    onValidationChange?: (result: PhoneValidationResult) => void
    onValueChange?: (details: PhoneInputValueChangeDetails) => void
    statusText?: ReactNode
    validateEmpty?: boolean
  }

const toSmartSuggestCountryCode = (countryCode: string | undefined) =>
  countryCode?.trim().toUpperCase() as Uppercase<string> | undefined

const getValidationStatus = (
  result: PhoneValidationResult | undefined
): PhoneInputValidateStatus => {
  if (result === undefined) {
    return "default"
  }

  return result.isValid ? "success" : "error"
}

const getStatusText = (
  helpText: ReactNode,
  result: PhoneValidationResult | undefined,
  statusText: ReactNode
) => {
  if (helpText !== undefined) {
    return helpText
  }

  if (statusText !== undefined) {
    return statusText
  }

  return result?.errors[0]?.message
}

export function PhoneValidationField({
  allowedCountries,
  country,
  defaultCountry,
  defaultValue,
  helpText,
  label,
  onCountryChange,
  onValidationChange,
  onValueChange,
  requireCountryMatch,
  requireMobile,
  statusText,
  validateEmpty = false,
  value,
  ...props
}: PhoneValidationFieldProps) {
  const [internalRawInput, setInternalRawInput] = useState(
    () => value ?? defaultValue ?? ""
  )
  const [internalCountry, setInternalCountry] = useState(
    () => country ?? defaultCountry
  )
  const rawInput = value ?? internalRawInput
  const validationCountry = toSmartSuggestCountryCode(
    String(country ?? internalCountry ?? defaultCountry ?? "")
  )
  const shouldValidate = validateEmpty || rawInput.trim().length > 0
  const validationResult = useMemo(
    () =>
      shouldValidate
        ? validatePhoneNumber({
            allowedCountries,
            defaultCountry: validationCountry,
            rawInput,
            requireCountryMatch,
            requireMobile,
          })
        : undefined,
    [
      allowedCountries,
      rawInput,
      requireCountryMatch,
      requireMobile,
      shouldValidate,
      validationCountry,
    ]
  )
  const validateStatus = getValidationStatus(validationResult)
  const resolvedStatusText = getStatusText(
    helpText,
    validationResult,
    statusText
  )

  return (
    <PhoneInput
      country={country}
      defaultCountry={defaultCountry}
      defaultValue={defaultValue}
      onCountryChange={(details) => {
        setInternalCountry(details.country)
        onCountryChange?.(details)
      }}
      onValueChange={(details) => {
        if (value === undefined) {
          setInternalRawInput(details.value)
        }

        const nextResult = validatePhoneNumber({
          allowedCountries,
          defaultCountry: toSmartSuggestCountryCode(details.country),
          rawInput: details.value,
          requireCountryMatch,
          requireMobile,
        })
        onValidationChange?.(nextResult)
        onValueChange?.(details)
      }}
      validateStatus={validateStatus}
      value={value}
      {...props}
    >
      <PhoneInput.Label>{label}</PhoneInput.Label>
      <PhoneInput.Control>
        <PhoneInput.CountryPicker />
        <PhoneInput.Input autoComplete="tel" />
      </PhoneInput.Control>
      {resolvedStatusText ? (
        <PhoneInput.StatusText>{resolvedStatusText}</PhoneInput.StatusText>
      ) : null}
    </PhoneInput>
  )
}
