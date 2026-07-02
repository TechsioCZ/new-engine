import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestValidationErrorBodySchema } from './payloads';

export class SmartSuggestValidationError extends Schema.TaggedErrorClass<SmartSuggestValidationError>()(
  'SmartSuggestValidationError',
  SmartSuggestValidationErrorBodySchema,
) {}

export const SmartSuggestValidationErrorSchema = SmartSuggestValidationError.pipe(
  HttpApiSchema.status(422),
);
