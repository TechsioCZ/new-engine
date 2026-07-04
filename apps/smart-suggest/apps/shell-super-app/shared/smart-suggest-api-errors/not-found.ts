import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestNotFoundErrorBodySchema } from './payloads';

export class SmartSuggestNotFoundError extends Schema.TaggedErrorClass<SmartSuggestNotFoundError>()(
  'SmartSuggestNotFoundError',
  SmartSuggestNotFoundErrorBodySchema,
) {}

export const SmartSuggestNotFoundErrorSchema = SmartSuggestNotFoundError.pipe(
  HttpApiSchema.status(404),
);
