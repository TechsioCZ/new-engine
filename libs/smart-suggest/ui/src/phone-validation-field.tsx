import type {
  PhoneStrictValidator,
  PhoneValidationMode,
  PhoneValidationPolicy,
  PhoneValidationRequest,
  PhoneValidationResult,
} from "@techsio/smart-suggest-validation/phone-lite"
import {
  DEFAULT_PHONE_VALIDATION_MODE,
  getPhoneInputHints,
  liteResultToPhoneValidationResult,
  validatePhoneNumberLite,
} from "@techsio/smart-suggest-validation/phone-lite"
import {
  PhoneInput,
  type PhoneInputCountryChangeDetails,
  type PhoneInputProps,
  type PhoneInputValidateStatus,
  type PhoneInputValueChangeDetails,
} from "@techsio/ui-kit/molecules/phone-input"
import {
  type FocusEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { getStatusText } from "./validation-status-text"

export type PhoneValidationFieldValidator = (
  request: PhoneValidationRequest
) =>
  | PhoneValidationResult
  | Promise<PhoneValidationResult | undefined>
  | undefined

export type PhoneValidationFieldProps = Omit<
  PhoneInputProps,
  "children" | "onCountryChange" | "onValueChange" | "validateStatus"
> &
  PhoneValidationPolicy & {
    label: ReactNode
    helpText?: ReactNode
    onCountryChange?: (details: PhoneInputCountryChangeDetails) => void
    /** Called when validation changes; undefined means the result was cleared. */
    onValidationChange?: (result: PhoneValidationResult | undefined) => void
    onValueChange?: (details: PhoneInputValueChangeDetails) => void
    statusText?: ReactNode
    validatePhoneNumber?: PhoneValidationFieldValidator
    validateEmpty?: boolean
    validationMode?: PhoneValidationMode
  }

let strictPhoneValidatorPromise: Promise<PhoneStrictValidator> | undefined

const loadStrictPhoneValidator = () => {
  strictPhoneValidatorPromise ??= import(
    "@techsio/smart-suggest-validation/phone-strict"
  ).then((module) => module.validatePhoneNumber)

  return strictPhoneValidatorPromise
}

const ignorePhoneValidationError = () => null

const toSmartSuggestCountryCode = (countryCode: string | undefined) =>
  countryCode?.trim()
    ? (countryCode.trim().toUpperCase() as Uppercase<string>)
    : undefined

const createLitePhoneValidationResult = (
  request: PhoneValidationRequest
): PhoneValidationResult | undefined => {
  return liteResultToPhoneValidationResult(validatePhoneNumberLite(request), {
    omitWhenStrictValidationRequired: true,
  })
}

const getValidationStatus = (
  result: PhoneValidationResult | undefined
): PhoneInputValidateStatus => {
  if (result === undefined) {
    return "default"
  }

  return result.isValid ? "success" : "error"
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
  onBlur,
  onCountryChange,
  onValidationChange,
  onValueChange,
  requireCountryMatch,
  requireMobile,
  statusText,
  validatePhoneNumber: providedValidatePhoneNumber,
  validateEmpty = false,
  validationMode = DEFAULT_PHONE_VALIDATION_MODE,
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
  const [validationResult, setValidationResult] = useState<
    PhoneValidationResult | undefined
  >(undefined)
  const validationRequestIdRef = useRef(0)

  const resolveValidationResult = useCallback(
    async (request: PhoneValidationRequest) => {
      if (validationMode === "server-only") {
        return providedValidatePhoneNumber === undefined
          ? createLitePhoneValidationResult(request)
          : providedValidatePhoneNumber(request)
      }

      try {
        const strictValidator = await loadStrictPhoneValidator()
        return strictValidator(request)
      } catch {
        return providedValidatePhoneNumber === undefined
          ? createLitePhoneValidationResult(request)
          : providedValidatePhoneNumber(request)
      }
    },
    [providedValidatePhoneNumber, validationMode]
  )

  const clearValidationResult = useCallback(() => {
    validationRequestIdRef.current += 1
    setValidationResult(undefined)
    onValidationChange?.(undefined)
  }, [onValidationChange])

  const validateCurrentValue = useCallback(
    async (
      nextRawInput = rawInput,
      nextValidationCountry = validationCountry
    ) => {
      const shouldValidate = validateEmpty || nextRawInput.trim().length > 0
      const validationRequestId = validationRequestIdRef.current + 1
      validationRequestIdRef.current = validationRequestId

      if (!shouldValidate) {
        setValidationResult(undefined)
        onValidationChange?.(undefined)
        return
      }

      const request = createPhoneValidationRequest(nextRawInput, {
        allowedCountries,
        defaultCountry: nextValidationCountry,
        requireCountryMatch,
        requireMobile,
      })
      let nextResult: PhoneValidationResult | undefined

      try {
        nextResult = await resolveValidationResult(request)
      } catch {
        nextResult = createLitePhoneValidationResult(request)
      }

      if (validationRequestId !== validationRequestIdRef.current) {
        return
      }

      setValidationResult(nextResult)
      onValidationChange?.(nextResult)
    },
    [
      allowedCountries,
      onValidationChange,
      rawInput,
      requireCountryMatch,
      requireMobile,
      resolveValidationResult,
      validateEmpty,
      validationCountry,
    ]
  )
  const validateCurrentValueRef = useRef(validateCurrentValue)

  useEffect(() => {
    validateCurrentValueRef.current = validateCurrentValue
  }, [validateCurrentValue])

  useEffect(() => {
    if (validationMode !== "frontend-immediate") {
      return
    }

    let isActive = true

    loadStrictPhoneValidator()
      .then(() => {
        if (isActive) {
          validateCurrentValueRef.current().catch(ignorePhoneValidationError)
        }
      })
      .catch(() => {
        if (isActive && providedValidatePhoneNumber !== undefined) {
          validateCurrentValueRef.current().catch(ignorePhoneValidationError)
        }
      })

    return () => {
      isActive = false
    }
  }, [providedValidatePhoneNumber, validationMode])

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
  const phoneInputHints = getPhoneInputHints()

  const preloadLazyValidator = (nextRawInput: string) => {
    if (validationMode === "frontend-lazy" && nextRawInput.trim().length > 0) {
      loadStrictPhoneValidator().catch(ignorePhoneValidationError)
    }
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    onBlur?.(event)

    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return
    }

    validateCurrentValue().catch(ignorePhoneValidationError)
  }

  return (
    <PhoneInput
      onBlur={handleBlur}
      onCountryChange={(details) => {
        setInternalCountry(details.country)
        clearValidationResult()
        preloadLazyValidator(rawInput)
        onCountryChange?.(details)
      }}
      onValueChange={(details) => {
        if (value === undefined) {
          setInternalRawInput(details.value)
        }

        clearValidationResult()
        preloadLazyValidator(details.value)
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
        <PhoneInput.Input autoComplete={phoneInputHints.autoComplete} />
      </PhoneInput.Control>
      {resolvedStatusText ? (
        <PhoneInput.StatusText>{resolvedStatusText}</PhoneInput.StatusText>
      ) : null}
    </PhoneInput>
  )
}
