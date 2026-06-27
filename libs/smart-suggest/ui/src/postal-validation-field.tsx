import type {
  PostalValidationResult,
  PostalValidationStatus,
} from "@techsio/smart-suggest-validation"
import {
  getPostalInputHints,
  validatePostalCode,
} from "@techsio/smart-suggest-validation"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import {
  type ChangeEventHandler,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useMemo,
  useState,
} from "react"

type FormInputProps = ComponentPropsWithoutRef<typeof FormInput>

export type PostalValidationFieldProps = Omit<
  FormInputProps,
  "autoComplete" | "helpText" | "inputMode" | "onChange" | "validateStatus"
> & {
  countryCode: Uppercase<string>
  helpText?: ReactNode
  onChange?: ChangeEventHandler<HTMLInputElement>
  onValidationChange?: (result: PostalValidationResult) => void
  statusText?: ReactNode
  validateEmpty?: boolean
}

const getValidationStatus = (
  status: PostalValidationStatus | undefined
): "default" | "error" | "success" | "warning" => {
  if (status === undefined) {
    return "default"
  }

  if (status === "unknown") {
    return "warning"
  }

  return status ? "success" : "error"
}

const getStatusText = (
  helpText: ReactNode,
  result: PostalValidationResult | undefined,
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

export function PostalValidationField({
  countryCode,
  defaultValue,
  helpText,
  onChange,
  onValidationChange,
  statusText,
  validateEmpty = false,
  value,
  ...props
}: PostalValidationFieldProps) {
  const [internalRawInput, setInternalRawInput] = useState(() =>
    String(value ?? defaultValue ?? "")
  )
  const rawInput =
    typeof value === "string" ? value : String(value ?? internalRawInput)
  const shouldValidate = validateEmpty || rawInput.trim().length > 0
  const normalizedCountryCode = countryCode
    .trim()
    .toUpperCase() as Uppercase<string>
  const validationResult = useMemo(
    () =>
      shouldValidate
        ? validatePostalCode({
            countryCode: normalizedCountryCode,
            rawInput,
          })
        : undefined,
    [normalizedCountryCode, rawInput, shouldValidate]
  )
  const inputHints = getPostalInputHints(normalizedCountryCode)
  const validateStatus = getValidationStatus(validationResult?.isValid)
  const resolvedStatusText = getStatusText(
    helpText,
    validationResult,
    statusText
  )
  const formInputDefaultValueProps =
    defaultValue === undefined ? {} : { defaultValue }
  const formInputHelpTextProps =
    resolvedStatusText === undefined ? {} : { helpText: resolvedStatusText }
  const formInputValueProps = value === undefined ? {} : { value }

  return (
    <FormInput
      autoComplete={inputHints.autoComplete}
      inputMode={inputHints.inputMode}
      onChange={(event) => {
        const nextValue = event.target.value

        if (value === undefined) {
          setInternalRawInput(nextValue)
        }

        onValidationChange?.(
          validatePostalCode({
            countryCode: normalizedCountryCode,
            rawInput: nextValue,
          })
        )
        onChange?.(event)
      }}
      validateStatus={validateStatus}
      {...props}
      {...formInputDefaultValueProps}
      {...formInputHelpTextProps}
      {...formInputValueProps}
    />
  )
}
