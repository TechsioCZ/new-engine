import { Effect } from 'effect';
import { HttpServerResponse } from 'effect/unstable/http';

import { SmartSuggestResponseSchema } from './api';
import type { SmartSuggestResponse } from './api';

const encodeSmartSuggestEdgeCacheResponse = HttpServerResponse.schemaJson(
  SmartSuggestResponseSchema,
);

export const createSmartSuggestEdgeCacheResponse = (body: SmartSuggestResponse) =>
  encodeSmartSuggestEdgeCacheResponse(body, {
    headers: {
      'cache-control': 'public, max-age=3600',
    },
  }).pipe(Effect.map((response) => HttpServerResponse.toWeb(response)));
