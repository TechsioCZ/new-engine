export interface FieldErrorMeta {
  errors: unknown[]
  isBlurred: boolean
  errorMap: {
    onBlur?: unknown
    onChange?: unknown
    onDynamic?: unknown
    onSubmit?: unknown
    onServer?: unknown
  }
}

export type FieldValidationSource = keyof FieldErrorMeta["errorMap"]

interface ResolvedFieldValidationResult {
  errorText?: string
  matchedSource: boolean
}

const toFieldErrorText = (error: unknown): string | undefined => {
  if (typeof error === "string" || typeof error === "number") {
    return String(error)
  }

  if (Array.isArray(error) && error.length > 0) {
    return toFieldErrorText(error[0])
  }

  return undefined
}

const hasValidationResult = (
  meta: FieldErrorMeta,
  source: FieldValidationSource,
) => Object.hasOwn(meta.errorMap, source)

export const hasValidationResultFromSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[],
) => sources.some((source) => hasValidationResult(meta, source))

export const resolveErrorFromValidationSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[],
): ResolvedFieldValidationResult => {
  for (const source of sources) {
    if (hasValidationResult(meta, source)) {
      const errorText = toFieldErrorText(meta.errorMap[source])
      return errorText === undefined
        ? { matchedSource: true }
        : { errorText, matchedSource: true }
    }
  }

  return { matchedSource: false }
}

export const resolveFallbackFieldError = (meta: FieldErrorMeta) =>
  toFieldErrorText(meta.errors[0])
