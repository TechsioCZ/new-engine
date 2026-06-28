export const createSmartSuggestEdgeCacheResponse = (body: unknown) =>
  Response.json(body, {
    headers: {
      'cache-control': 'public, max-age=3600',
    },
  });
