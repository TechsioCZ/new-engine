import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestBadRequestErrorBodySchema } from './payloads';

export class SmartSuggestBadRequestError extends Schema.TaggedErrorClass<SmartSuggestBadRequestError>()(
  'SmartSuggestBadRequestError',
  SmartSuggestBadRequestErrorBodySchema,
) {}

export const SmartSuggestBadRequestErrorSchema = SmartSuggestBadRequestError.pipe(
  HttpApiSchema.status(400),
);
