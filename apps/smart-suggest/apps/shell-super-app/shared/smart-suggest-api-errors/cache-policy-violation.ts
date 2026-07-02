import { Schema } from 'effect';
import { HttpApiSchema } from 'effect/unstable/httpapi';
import { SmartSuggestCachePolicyViolationErrorBodySchema } from './payloads';

export class SmartSuggestCachePolicyViolationError extends Schema.TaggedErrorClass<SmartSuggestCachePolicyViolationError>()(
  'SmartSuggestCachePolicyViolationError',
  SmartSuggestCachePolicyViolationErrorBodySchema,
) {}

export const SmartSuggestCachePolicyViolationErrorSchema =
  SmartSuggestCachePolicyViolationError.pipe(HttpApiSchema.status(409));
