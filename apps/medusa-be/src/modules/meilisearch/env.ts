export const isMeilisearchEnabled = (): boolean =>
  process.env["MEILISEARCH_ENABLED"] === "1"
