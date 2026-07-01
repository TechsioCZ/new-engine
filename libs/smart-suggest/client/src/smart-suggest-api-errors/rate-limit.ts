import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestRateLimitErrorBodySchema } from './payloads';

export class SmartSuggestRateLimitError extends Schema.TaggedErrorClass<SmartSuggestRateLimitError>()(
  'SmartSuggestRateLimitError',
  SmartSuggestRateLimitErrorBodySchema,
) {}

export const SmartSuggestRateLimitErrorSchema = SmartSuggestRateLimitError.pipe(
  HttpApiSchema.status(429),
);
