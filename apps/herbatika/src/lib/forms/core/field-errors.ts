import type { FieldErrorMeta } from "./field-error-validation-results"
import {
  hasValidationResultFromSources,
  resolveErrorFromValidationSources,
  resolveFallbackFieldError,
} from "./field-error-validation-results"

interface ResolveVisibleFieldErrorOptions {
  hasChangedSinceBlur?: boolean
  meta: FieldErrorMeta
  submissionAttempts: number
  validationMode?: "none" | "blur"
}

type FieldValidateStatus = "default" | "error"

interface VisibleFieldFeedback {
  errorText: string | undefined
  validateStatus: FieldValidateStatus
}

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
    LIVE_VALIDATION_SOURCES,
  )

  return liveResult.matchedSource ? liveResult.errorText : undefined
}

const resolveSubmittedFieldError = (
  meta: FieldErrorMeta,
  hasChangedSinceBlur: boolean,
) => {
  if (hasChangedSinceBlur) {
    return resolveChangedFieldError(meta)
  }

  if (meta.isBlurred) {
    const blurredResult = resolveErrorFromValidationSources(
      meta,
      BLURRED_SUBMITTED_VALIDATION_SOURCES,
    )

    return blurredResult.matchedSource
      ? blurredResult.errorText
      : resolveFallbackFieldError(meta)
  }

  const submittedResult = resolveErrorFromValidationSources(
    meta,
    SUBMITTED_VALIDATION_SOURCES,
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
  hasChangedSinceBlur: boolean,
) => {
  if (hasChangedSinceBlur) {
    return resolveChangedFieldError(meta)
  }

  const blurredResult = resolveErrorFromValidationSources(
    meta,
    BLURRED_VALIDATION_SOURCES,
  )

  return blurredResult.matchedSource
    ? blurredResult.errorText
    : resolveFallbackFieldError(meta)
}

const resolveVisibleFieldError = ({
  hasChangedSinceBlur = false,
  meta,
  submissionAttempts,
  validationMode = "blur",
}: ResolveVisibleFieldErrorOptions) => {
  let errorText: string | undefined

  if (validationMode !== "none") {
    if (submissionAttempts > 0) {
      errorText = resolveSubmittedFieldError(meta, hasChangedSinceBlur)
    } else if (meta.isBlurred) {
      errorText = resolveBlurredFieldError(meta, hasChangedSinceBlur)
    }
  }

  return errorText
}

export const resolveVisibleFieldFeedback = (
  options: ResolveVisibleFieldErrorOptions,
): VisibleFieldFeedback => {
  const errorText = resolveVisibleFieldError(options)

  return {
    errorText,
    validateStatus: (errorText ?? "").length > 0 ? "error" : "default",
  }
}
