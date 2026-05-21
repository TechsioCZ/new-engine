export function isMeilisearchEnabled(): boolean {
  return process.env.MEILISEARCH_ENABLED === "1"
}
