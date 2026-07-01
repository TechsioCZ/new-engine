import { Effect } from 'effect';
import { HttpServerResponse } from 'effect/unstable/http';

import { SmartSuggestResponseSchema } from './api';
import type { SmartSuggestResponse } from './api';

const encodeSmartSuggestEdgeCacheResponse = HttpServerResponse.schemaJson(
  SmartSuggestResponseSchema,
);

const defaultSmartSuggestEdgeCacheTtlSeconds = 3600;

const normalizeSmartSuggestEdgeCacheTtlSeconds = (ttlSeconds: number | undefined) =>
  ttlSeconds === undefined || !Number.isFinite(ttlSeconds)
    ? defaultSmartSuggestEdgeCacheTtlSeconds
    : Math.max(0, Math.trunc(ttlSeconds));

export const createSmartSuggestEdgeCacheResponse = (
  body: SmartSuggestResponse,
  options: { ttlSeconds?: number } = {},
) => {
  const ttlSeconds = normalizeSmartSuggestEdgeCacheTtlSeconds(options.ttlSeconds);

  return encodeSmartSuggestEdgeCacheResponse(body, {
    headers: {
      'cache-control': `public, max-age=${ttlSeconds}`,
    },
  }).pipe(Effect.map((response) => HttpServerResponse.toWeb(response)));
};
