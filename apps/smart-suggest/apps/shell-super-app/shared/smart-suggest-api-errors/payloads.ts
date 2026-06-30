import { Schema } from 'effect';

const nonBlankString = (fieldName: string) =>
  Schema.makeFilter<string>((value) =>
    value.trim().length > 0 ? undefined : `Expected a non-blank ${fieldName}.`,
  );

export const SmartSuggestErrorCodeSchema = Schema.Literals([
  'bad-request',
  'forbidden',
  'validation-error',
  'provider-timeout',
  'provider-unavailable',
  'cache-policy-violation',
  'storage-unavailable',
  'not-found',
  'rate-limit',
  'unauthorized',
  'internal-error',
]);

export const SmartSuggestErrorMessageSchema = Schema.String.check(
  nonBlankString('error message'),
  Schema.isMaxLength(2048),
);

export const SmartSuggestErrorFieldSchema = Schema.String.check(
  nonBlankString('error field'),
  Schema.isMaxLength(256),
);

const SmartSuggestErrorPayloadBaseFields = {
  field: Schema.optionalKey(SmartSuggestErrorFieldSchema),
  message: SmartSuggestErrorMessageSchema,
  retryable: Schema.optionalKey(Schema.Boolean),
} as const;

export const SmartSuggestBadRequestErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('bad-request'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestCachePolicyViolationErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('cache-policy-violation'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestForbiddenErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('forbidden'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestErrorPayloadSchema = Schema.Struct({
  code: SmartSuggestErrorCodeSchema,
  field: Schema.optionalKey(SmartSuggestErrorFieldSchema),
  message: SmartSuggestErrorMessageSchema,
  retryable: Schema.optionalKey(Schema.Boolean),
});

export const SmartSuggestInternalErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('internal-error'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestNotFoundErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('not-found'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestProviderTimeoutErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('provider-timeout'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestProviderUnavailableErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('provider-unavailable'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestRateLimitErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('rate-limit'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestStorageUnavailableErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('storage-unavailable'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestUnauthorizedErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('unauthorized'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestValidationErrorPayloadSchema = Schema.Struct({
  code: Schema.Literal('validation-error'),
  ...SmartSuggestErrorPayloadBaseFields,
});

export const SmartSuggestBadRequestErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestBadRequestErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestCachePolicyViolationErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestCachePolicyViolationErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestForbiddenErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestForbiddenErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestInternalErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestInternalErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestNotFoundErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestNotFoundErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestProviderTimeoutErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestProviderTimeoutErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestProviderUnavailableErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestProviderUnavailableErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestRateLimitErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestRateLimitErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestStorageUnavailableErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestStorageUnavailableErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestUnauthorizedErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestUnauthorizedErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});

export const SmartSuggestValidationErrorBodySchema = Schema.Struct({
  errors: Schema.mutable(Schema.NonEmptyArray(SmartSuggestValidationErrorPayloadSchema)),
  message: SmartSuggestErrorMessageSchema,
});
