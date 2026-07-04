import { Effect } from "effect"

import { validatePostalCode } from "./validation"
import type {
  PostalValidationRequest,
  PostalValidationResult,
} from "./validation"
import { validatePhoneNumberLite } from "./phone-lite"
import type {
  PhoneLiteValidationRequest,
  PhoneLiteValidationResult,
} from "./phone-lite"
import {
  PhoneLiteValidationError,
  PostalValidationError,
} from "./schemas"

const validationMessage = (
  errors: readonly { message: string }[],
  fallback: string
) => errors[0]?.message ?? fallback

export const validatePhoneNumberLiteEffect = (
  request: PhoneLiteValidationRequest
): Effect.Effect<PhoneLiteValidationResult, PhoneLiteValidationError, never> => {
  const result = validatePhoneNumberLite(request)

  if (result.errors.length === 0) {
    return Effect.succeed(result)
  }

  return Effect.fail(
    new PhoneLiteValidationError({
      issues: result.errors,
      message: validationMessage(result.errors, "Phone validation failed."),
      result,
    })
  )
}

export const validatePostalCodeEffect = (
  request: PostalValidationRequest
): Effect.Effect<PostalValidationResult, PostalValidationError, never> => {
  const result = validatePostalCode(request)

  if (result.isValid === true) {
    return Effect.succeed(result)
  }

  return Effect.fail(
    new PostalValidationError({
      issues: result.errors,
      message: validationMessage(result.errors, "Postal validation failed."),
      result,
    })
  )
}
