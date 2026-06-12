type FieldErrorMeta = {
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

type ResolveVisibleFieldErrorOptions = {
  hasChangedSinceBlur?: boolean
  meta: FieldErrorMeta
  submissionAttempts: number
  validationMode?: "none" | "blur"
}

type FieldValidationSource = keyof FieldErrorMeta["errorMap"]
type FieldValidateStatus = "default" | "error"

type VisibleFieldFeedback = {
  errorText: string | undefined
  validateStatus: FieldValidateStatus
}

type ResolvedFieldValidationResult = {
  errorText: string | undefined
  matchedSource: boolean
}

export const toFieldErrorText = (error: unknown): string | undefined => {
  if (typeof error === "string" || typeof error === "number") {
    return String(error)
  }

  if (Array.isArray(error) && error.length > 0) {
    return toFieldErrorText(error[0])
  }

  return
}

const hasValidationResult = (
  meta: FieldErrorMeta,
  source: FieldValidationSource
) => Object.hasOwn(meta.errorMap, source)

const hasValidationResultFromSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[]
) => sources.some((source) => hasValidationResult(meta, source))

const resolveErrorFromValidationSources = (
  meta: FieldErrorMeta,
  sources: readonly FieldValidationSource[]
): ResolvedFieldValidationResult => {
  for (const source of sources) {
    if (hasValidationResult(meta, source)) {
      return {
        errorText: toFieldErrorText(meta.errorMap[source]),
        matchedSource: true,
      }
    }
  }

  return {
    errorText: undefined,
    matchedSource: false,
  }
}

const resolveFallbackFieldError = (meta: FieldErrorMeta) =>
  toFieldErrorText(meta.errors[0])

const LIVE_VALIDATION_SOURCES = ["onDynamic", "onChange"] as const
const BLURRED_SUBMITTED_VALIDATION_SOURCES = [
  "onServer",
  "onSubmit",
  "onDynamic",
  "onChange",
  "onBlur",
] as const
const SUBMITTED_VALIDATION_SOURCES = ["onServer", "onSubmit", "onBlur"] as const
const BLURRED_VALIDATION_SOURCES = ["onDynamic", "onChange", "onBlur"] as const

export const shouldTrackLiveFieldFeedback = ({
  meta,
  submissionAttempts,
}: Pick<ResolveVisibleFieldErrorOptions, "meta" | "submissionAttempts">) => {
  if (meta.isBlurred) {
    return true
  }

  if (submissionAttempts < 1) {
    return false
  }

  return (
    hasValidationResultFromSources(meta, ["onServer", "onSubmit", "onBlur"]) ||
    meta.errors.length > 0
  )
}

const resolveChangedFieldError = (meta: FieldErrorMeta) => {
  const liveResult = resolveErrorFromValidationSources(
    meta,
    LIVE_VALIDATION_SOURCES
  )

  return liveResult.matchedSource ? liveResult.errorText : undefined
}

const resolveSubmittedFieldError = (
  meta: FieldErrorMeta,
  hasChangedSinceBlur: boolean
) => {
  if (hasChangedSinceBlur) {
    return resolveChangedFieldError(meta)
  }

  if (meta.isBlurred) {
    const blurredResult = resolveErrorFromValidationSources(
      meta,
      BLURRED_SUBMITTED_VALIDATION_SOURCES
    )

    return blurredResult.matchedSource
      ? blurredResult.errorText
      : resolveFallbackFieldError(meta)
  }

  const submittedResult = resolveErrorFromValidationSources(
    meta,
    SUBMITTED_VALIDATION_SOURCES
  )

  if (submittedResult.matchedSource) {
    return submittedResult.errorText
  }

  return hasValidationResultFromSources(meta, LIVE_VALIDATION_SOURCES)
    ? undefined
    : resolveFallbackFieldError(meta)
}

const resolveBlurredFieldError = (
  meta: FieldErrorMeta,
  hasChangedSinceBlur: boolean
) => {
  if (hasChangedSinceBlur) {
    return resolveChangedFieldError(meta)
  }

  const blurredResult = resolveErrorFromValidationSources(
    meta,
    BLURRED_VALIDATION_SOURCES
  )

  return blurredResult.matchedSource
    ? blurredResult.errorText
    : resolveFallbackFieldError(meta)
}

export const resolveVisibleFieldError = ({
  hasChangedSinceBlur = false,
  meta,
  submissionAttempts,
  validationMode = "blur",
}: ResolveVisibleFieldErrorOptions) => {
  if (validationMode === "none") {
    return
  }

  if (submissionAttempts > 0) {
    return resolveSubmittedFieldError(meta, hasChangedSinceBlur)
  }

  if (!meta.isBlurred) {
    return
  }

  return resolveBlurredFieldError(meta, hasChangedSinceBlur)
}

export const resolveVisibleFieldFeedback = (
  options: ResolveVisibleFieldErrorOptions
): VisibleFieldFeedback => {
  const errorText = resolveVisibleFieldError(options)

  return {
    errorText,
    validateStatus: errorText ? "error" : "default",
  }
}
