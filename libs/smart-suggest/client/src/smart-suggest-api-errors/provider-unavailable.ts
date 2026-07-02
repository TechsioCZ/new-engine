import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestProviderUnavailableErrorBodySchema } from './payloads';

export class SmartSuggestProviderUnavailableError extends Schema.TaggedErrorClass<SmartSuggestProviderUnavailableError>()(
  'SmartSuggestProviderUnavailableError',
  SmartSuggestProviderUnavailableErrorBodySchema,
) {}

export const SmartSuggestProviderUnavailableErrorSchema = SmartSuggestProviderUnavailableError.pipe(
  HttpApiSchema.status(503),
);
