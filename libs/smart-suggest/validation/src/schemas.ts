import { Schema } from "effect"

export const SmartSuggestCountryCodeSchema = Schema.String.check(
  Schema.isPattern(/^[A-Z]{2}$/u)
)

export const ValidationIssueSchema = Schema.Struct({
  code: Schema.String,
  field: Schema.String,
  message: Schema.String,
})

export const PhoneNumberTypeSchema = Schema.Literals([
  "PREMIUM_RATE",
  "TOLL_FREE",
  "SHARED_COST",
  "VOIP",
  "PERSONAL_NUMBER",
  "PAGER",
  "UAN",
  "VOICEMAIL",
  "FIXED_LINE_OR_MOBILE",
  "FIXED_LINE",
  "MOBILE",
])

export const PhoneInputHintsSchema = Schema.Struct({
  autoComplete: Schema.Literal("tel"),
  inputMode: Schema.Literal("tel"),
  type: Schema.Literal("tel"),
})

export const PhoneValidationRequestSchema = Schema.Struct({
  allowedCountries: Schema.optionalKey(
    Schema.mutable(Schema.Array(SmartSuggestCountryCodeSchema))
  ),
  defaultCountry: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  rawInput: Schema.String,
  requireCountryMatch: Schema.optionalKey(Schema.Boolean),
  requireMobile: Schema.optionalKey(Schema.Boolean),
})

export const PhoneValidationResultSchema = Schema.Struct({
  callingCode: Schema.optionalKey(Schema.String),
  detectedCountry: Schema.optionalKey(SmartSuggestCountryCodeSchema),
  displayValue: Schema.String,
  e164: Schema.optionalKey(Schema.String),
  errors: Schema.mutable(Schema.Array(ValidationIssueSchema)),
  isPossible: Schema.Boolean,
  isValid: Schema.Boolean,
  nationalNumber: Schema.optionalKey(Schema.String),
  rawInput: Schema.String,
  type: Schema.optionalKey(PhoneNumberTypeSchema),
})

export const PhoneLiteValidationStatusSchema = Schema.Literals([
  "empty",
  "malformed",
  "too_short",
  "too_long",
  "strict_validation_required",
])

export const PhoneLiteValidationResultSchema = Schema.Struct({
  canAttemptStrictValidation: Schema.Boolean,
  displayValue: Schema.String,
  errors: Schema.mutable(Schema.Array(ValidationIssueSchema)),
  inputHints: PhoneInputHintsSchema,
  normalizedDigits: Schema.String,
  rawInput: Schema.String,
  requiresStrictValidation: Schema.Boolean,
  status: PhoneLiteValidationStatusSchema,
})

export const PostalValidationStatusSchema = Schema.Union([
  Schema.Boolean,
  Schema.Literal("unknown"),
])

export const PostalInputHintsSchema = Schema.Struct({
  autoComplete: Schema.Literal("postal-code"),
  inputMode: Schema.Literals(["numeric", "text"]),
})

export const PostalValidationRequestSchema = Schema.Struct({
  countryCode: SmartSuggestCountryCodeSchema,
  rawInput: Schema.String,
})

export const PostalValidationResultSchema = Schema.Struct({
  countryCode: SmartSuggestCountryCodeSchema,
  displayValue: Schema.String,
  errors: Schema.mutable(Schema.Array(ValidationIssueSchema)),
  inputHints: PostalInputHintsSchema,
  isValid: PostalValidationStatusSchema,
  normalizedValue: Schema.String,
  rawInput: Schema.String,
})

export class PhoneValidationError extends Schema.TaggedErrorClass<PhoneValidationError>()(
  "PhoneValidationError",
  Schema.Struct({
    issues: Schema.mutable(Schema.Array(ValidationIssueSchema)),
    message: Schema.String,
    result: PhoneValidationResultSchema,
  })
) {}

export class PhoneLiteValidationError extends Schema.TaggedErrorClass<PhoneLiteValidationError>()(
  "PhoneLiteValidationError",
  Schema.Struct({
    issues: Schema.mutable(Schema.Array(ValidationIssueSchema)),
    message: Schema.String,
    result: PhoneLiteValidationResultSchema,
  })
) {}

export class PostalValidationError extends Schema.TaggedErrorClass<PostalValidationError>()(
  "PostalValidationError",
  Schema.Struct({
    issues: Schema.mutable(Schema.Array(ValidationIssueSchema)),
    message: Schema.String,
    result: PostalValidationResultSchema,
  })
) {}

export type DecodedPhoneValidationRequest =
  typeof PhoneValidationRequestSchema.Type
export type DecodedPhoneValidationResult =
  typeof PhoneValidationResultSchema.Type
export type DecodedPhoneLiteValidationResult =
  typeof PhoneLiteValidationResultSchema.Type
export type DecodedPostalValidationRequest =
  typeof PostalValidationRequestSchema.Type
export type DecodedPostalValidationResult =
  typeof PostalValidationResultSchema.Type
