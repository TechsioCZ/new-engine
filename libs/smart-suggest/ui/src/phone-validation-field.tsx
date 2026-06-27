import type {
  PhoneValidationPolicy,
  PhoneValidationRequest,
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
  countryCode?.trim()
    ? (countryCode.trim().toUpperCase() as Uppercase<string>)
    : undefined

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

const createPhoneValidationRequest = (
  rawInput: string,
  options: {
    allowedCountries: PhoneValidationPolicy["allowedCountries"] | undefined
    defaultCountry: Uppercase<string> | undefined
    requireCountryMatch: boolean | undefined
    requireMobile: boolean | undefined
  }
) => {
  const request: PhoneValidationRequest = { rawInput }

  if (options.allowedCountries !== undefined) {
    request.allowedCountries = options.allowedCountries
  }

  if (options.defaultCountry !== undefined) {
    request.defaultCountry = options.defaultCountry
  }

  if (options.requireCountryMatch !== undefined) {
    request.requireCountryMatch = options.requireCountryMatch
  }

  if (options.requireMobile !== undefined) {
    request.requireMobile = options.requireMobile
  }

  return request
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
        ? validatePhoneNumber(
            createPhoneValidationRequest(rawInput, {
              allowedCountries,
              defaultCountry: validationCountry,
              requireCountryMatch,
              requireMobile,
            })
          )
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
  const phoneInputValueProps = value === undefined ? {} : { value }
  const phoneInputDefaultValueProps =
    defaultValue === undefined ? {} : { defaultValue }
  const phoneInputCountryProps = country === undefined ? {} : { country }
  const phoneInputDefaultCountryProps =
    defaultCountry === undefined ? {} : { defaultCountry }

  return (
    <PhoneInput
      onCountryChange={(details) => {
        setInternalCountry(details.country)
        onCountryChange?.(details)
      }}
      onValueChange={(details) => {
        if (value === undefined) {
          setInternalRawInput(details.value)
        }

        const nextResult = validatePhoneNumber(
          createPhoneValidationRequest(details.value, {
            allowedCountries,
            defaultCountry: toSmartSuggestCountryCode(details.country),
            requireCountryMatch,
            requireMobile,
          })
        )
        onValidationChange?.(nextResult)
        onValueChange?.(details)
      }}
      validateStatus={validateStatus}
      {...props}
      {...phoneInputCountryProps}
      {...phoneInputDefaultCountryProps}
      {...phoneInputDefaultValueProps}
      {...phoneInputValueProps}
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
