import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestForbiddenErrorBodySchema } from './payloads';

export class SmartSuggestForbiddenError extends Schema.TaggedErrorClass<SmartSuggestForbiddenError>()(
  'SmartSuggestForbiddenError',
  SmartSuggestForbiddenErrorBodySchema,
) {}

export const SmartSuggestForbiddenErrorSchema = SmartSuggestForbiddenError.pipe(
  HttpApiSchema.status(403),
);
