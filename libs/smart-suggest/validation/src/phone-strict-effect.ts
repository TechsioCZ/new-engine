import { Effect } from "effect"

import { validatePhoneNumber } from "./phone-strict"
import type { PhoneValidationRequest, PhoneValidationResult } from "./phone-lite"
import { PhoneValidationError } from "./schemas"

const validationMessage = (
  errors: readonly { message: string }[],
  fallback: string
) => errors[0]?.message ?? fallback

export const validatePhoneNumberStrictEffect = (
  request: PhoneValidationRequest
): Effect.Effect<PhoneValidationResult, PhoneValidationError, never> => {
  const result = validatePhoneNumber(request)

  if (result.isValid) {
    return Effect.succeed(result)
  }

  return Effect.fail(
    new PhoneValidationError({
      issues: result.errors,
      message: validationMessage(result.errors, "Phone validation failed."),
      result,
    })
  )
}

export const validatePhoneNumberEffect = validatePhoneNumberStrictEffect
