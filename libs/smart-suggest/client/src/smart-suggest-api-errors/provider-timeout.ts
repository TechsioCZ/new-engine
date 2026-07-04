import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestProviderTimeoutErrorBodySchema } from './payloads';

export class SmartSuggestProviderTimeoutError extends Schema.TaggedErrorClass<SmartSuggestProviderTimeoutError>()(
  'SmartSuggestProviderTimeoutError',
  SmartSuggestProviderTimeoutErrorBodySchema,
) {}

export const SmartSuggestProviderTimeoutErrorSchema = SmartSuggestProviderTimeoutError.pipe(
  HttpApiSchema.status(504),
);
