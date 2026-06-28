import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestStorageUnavailableErrorBodySchema } from './payloads';

export class SmartSuggestStorageUnavailableError extends Schema.TaggedErrorClass<SmartSuggestStorageUnavailableError>()(
  'SmartSuggestStorageUnavailableError',
  SmartSuggestStorageUnavailableErrorBodySchema,
) {}

export const SmartSuggestStorageUnavailableErrorSchema = SmartSuggestStorageUnavailableError.pipe(
  HttpApiSchema.status(503),
);
