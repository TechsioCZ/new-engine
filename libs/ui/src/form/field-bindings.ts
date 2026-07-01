import type { ChangeEvent, FocusEvent } from "react"
import type { AnyFieldApi } from "@tanstack/react-form"

export type FieldValidateStatus = "default" | "error" | "success" | "warning"
export type FieldErrorVisibility = "always" | "touched" | "blurred" | "never"

export type FieldBaseOptions = {
  id?: string
  name?: string
}

export type FieldBaseProps = {
  id: string
  name: string
  onBlur: (event?: FocusEvent<HTMLElement>) => void
}

export type TextFieldOptions<TValue> = FieldBaseOptions & {
  formatValue?: (value: TValue | null | undefined) => string
  parseValue?: (value: string) => TValue
}

export type TextFieldProps = FieldBaseProps & {
  value: string
  onChange: (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void
}

export type CheckboxFieldOptions = FieldBaseOptions & {
  isChecked?: (value: unknown) => boolean
  touchOnChange?: boolean
}

export type CheckboxFieldProps = FieldBaseProps & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export type ValueFieldProps<TValue> = FieldBaseProps & {
  value: TValue
  onValueChange: (value: TValue) => void
}

export type FieldErrorOptions = {
  when?: FieldErrorVisibility
  pickError?: (errors: readonly unknown[]) => unknown | undefined
  formatError?: (error: unknown) => string | undefined
  externalError?: string
}

export type FieldStatusOptions = FieldErrorOptions & {
  errorId?: string
}

export type FieldStatus = {
  errorMessage?: string
  errorId: string
  validateStatus: FieldValidateStatus
  "aria-invalid": boolean
  "aria-describedby"?: string
}

export type SelectFieldOptions = FieldBaseOptions & {
  multiple?: boolean
  touchOnChange?: boolean
  allowEmpty?: boolean
  valueToString?: (value: unknown) => string
  parseValue?: (value: string) => unknown
}

export type SelectFieldProps = FieldBaseProps & {
  value: string[]
  onValueChange: (details: { value: string[] }) => void
}

export type NumericFieldOptions<TValue> = FieldBaseOptions & {
  formatValue?: (value: TValue | null | undefined) => number | undefined
  parseValue?: (value: number) => TValue
}

export type NumericFieldProps = FieldBaseProps & {
  value?: number
  onChange: (value: number) => void
}

const defaultFormatValue = (value: unknown) =>
  value === null || value === undefined ? "" : String(value)

const defaultParseValue = (value: string) => value

const defaultPickError = (errors: readonly unknown[]) => errors[0]

const defaultFormatError = (error: unknown) =>
  typeof error === "string" ? error : error ? String(error) : undefined

// FieldMeta extends AnyFieldApi["state"]["meta"] with optional isBlurred.
// isBlurred is not in TanStack Form; consumers can set it on explicit blur or UI transitions
// to drive conditional validation/styling in FieldMeta-aware components.
type FieldMeta = AnyFieldApi["state"]["meta"] & { isBlurred?: boolean }

export function getFieldBaseProps(
  field: AnyFieldApi,
  options?: FieldBaseOptions
): FieldBaseProps {
  const name = options?.name ?? field.name
  const id = options?.id ?? name

  return {
    id,
    name,
    onBlur: field.handleBlur,
  }
}

export function getTextFieldProps<TValue = string>(
  field: AnyFieldApi,
  options?: TextFieldOptions<TValue>
): TextFieldProps {
  const formatValue = options?.formatValue ?? defaultFormatValue
  const parseValue = options?.parseValue ?? defaultParseValue
  const baseProps = getFieldBaseProps(field, options)

  return {
    ...baseProps,
    value: formatValue(field.state.value as TValue),
    onChange: (event) => {
      field.handleChange(parseValue(event.target.value))
    },
  }
}

export function getCheckboxFieldProps(
  field: AnyFieldApi,
  options?: CheckboxFieldOptions
): CheckboxFieldProps {
  const baseProps = getFieldBaseProps(field, options)
  const meta = field.state.meta as FieldMeta
  const isChecked = options?.isChecked ?? ((value) => value === true)
  const touchOnChange = options?.touchOnChange ?? true

  return {
    ...baseProps,
    checked: isChecked(field.state.value),
    onCheckedChange: (checked) => {
      field.handleChange(checked)
      if (touchOnChange && !meta.isTouched) {
        field.handleBlur()
      }
    },
  }
}

export function getValueFieldProps<TValue = unknown>(
  field: AnyFieldApi,
  options?: FieldBaseOptions
): ValueFieldProps<TValue> {
  const baseProps = getFieldBaseProps(field, options)

  return {
    ...baseProps,
    value: field.state.value as TValue,
    onValueChange: field.handleChange as (value: TValue) => void,
  }
}

export function getSelectFieldProps(
  field: AnyFieldApi,
  options?: SelectFieldOptions
): SelectFieldProps {
  const baseProps = getFieldBaseProps(field, options)
  const meta = field.state.meta as FieldMeta
  const touchOnChange = options?.touchOnChange ?? true
  const allowEmpty = options?.allowEmpty ?? false
  const valueToString = options?.valueToString ?? defaultFormatValue
  const parseValue = options?.parseValue ?? ((value: string) => value)
  const rawValue = field.state.value

  const value = options?.multiple
    ? Array.isArray(rawValue)
      ? rawValue.map(valueToString)
      : rawValue === null || rawValue === undefined
        ? []
        : [valueToString(rawValue)]
    : [rawValue === null || rawValue === undefined ? "" : valueToString(rawValue)]

  return {
    ...baseProps,
    value,
    onValueChange: (details) => {
      if (options?.multiple) {
        if (allowEmpty || details.value.length > 0) {
          field.handleChange(details.value.map((value) => parseValue(value)))
          if (touchOnChange && !meta.isTouched) {
            field.handleBlur()
          }
        }
        return
      }

      const nextValue = details.value[0] ?? ""
      if (allowEmpty || nextValue) {
        field.handleChange(parseValue(nextValue))
        if (touchOnChange && !meta.isTouched) {
          field.handleBlur()
        }
      }
    },
  }
}

export function getNumericFieldProps<TValue = number>(
  field: AnyFieldApi,
  options?: NumericFieldOptions<TValue>
): NumericFieldProps {
  const baseProps = getFieldBaseProps(field, options)
  const formatValue =
    options?.formatValue ??
    ((value: TValue | null | undefined) => {
      if (typeof value === "number") {
        return Number.isNaN(value) ? undefined : value
      }
      if (value === null || value === undefined) return undefined
      const parsed = Number(value)
      return Number.isNaN(parsed) ? undefined : parsed
    })
  const parseValue =
    options?.parseValue ?? ((value: number) => value as TValue)

  return {
    ...baseProps,
    value: formatValue(field.state.value as TValue),
    onChange: (value) => {
      if (Number.isNaN(value)) {
        field.handleChange(undefined as TValue)
        return
      }
      field.handleChange(parseValue(value))
    },
  }
}

export function getFieldErrors(field: AnyFieldApi): readonly unknown[] {
  return Array.isArray(field.state.meta.errors)
    ? field.state.meta.errors
    : []
}

export function getFieldError(
  field: AnyFieldApi,
  options?: FieldErrorOptions
): string | undefined {
  if (options?.externalError) return options.externalError
  const errors = getFieldErrors(field)
  if (errors.length === 0) return undefined

  const when = options?.when ?? "blurred"
  if (when === "never") return undefined

  const meta = field.state.meta as FieldMeta
  const isTouched = meta.isTouched ?? false
  // FieldMeta.isBlurred is not populated by TanStack Form; "blurred" equals "touched" until blur tracking is implemented.
  const isBlurred = meta.isBlurred ?? isTouched

  if (when === "touched" && !isTouched) return undefined
  if (when === "blurred" && !isBlurred) return undefined

  const pickError = options?.pickError ?? defaultPickError
  const formatError = options?.formatError ?? defaultFormatError

  return formatError(pickError(errors))
}

export function getFieldValidateStatus(
  field: AnyFieldApi,
  options?: FieldErrorOptions
): FieldValidateStatus {
  return getFieldError(field, options) ? "error" : "default"
}

export function getFieldStatus(
  field: AnyFieldApi,
  options?: FieldStatusOptions
): FieldStatus {
  const errorMessage = getFieldError(field, options)
  const errorId = options?.errorId ?? `${field.name}-error`
  const hasError = !!errorMessage

  return {
    errorMessage,
    errorId,
    validateStatus: hasError ? "error" : "default",
    "aria-invalid": hasError,
    "aria-describedby": hasError ? errorId : undefined,
  }
}
