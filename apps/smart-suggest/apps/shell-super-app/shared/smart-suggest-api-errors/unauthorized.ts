import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestUnauthorizedErrorBodySchema } from './payloads';

export class SmartSuggestUnauthorizedError extends Schema.TaggedErrorClass<SmartSuggestUnauthorizedError>()(
  'SmartSuggestUnauthorizedError',
  SmartSuggestUnauthorizedErrorBodySchema,
) {}

export const SmartSuggestUnauthorizedErrorSchema = SmartSuggestUnauthorizedError.pipe(
  HttpApiSchema.status(401),
);
