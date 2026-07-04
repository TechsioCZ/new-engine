import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestInternalErrorBodySchema } from './payloads';

export class SmartSuggestInternalError extends Schema.TaggedErrorClass<SmartSuggestInternalError>()(
  'SmartSuggestInternalError',
  SmartSuggestInternalErrorBodySchema,
) {}

export const SmartSuggestInternalErrorSchema = SmartSuggestInternalError.pipe(
  HttpApiSchema.status(500),
);
