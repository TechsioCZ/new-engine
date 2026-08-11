import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { syncMeilisearchBrandsWorkflow } from "../workflows/meilisearch/workflows/sync-brands"
import { synchronizeSearchProfilesWorkflow } from "../workflows/meilisearch/workflows/synchronize-search-profiles"

export default async function meilisearchSyncBrandsHandler({
  container,
}: SubscriberArgs) {
  await syncMeilisearchBrandsWorkflow(container).run({
    input: {},
  })
  await synchronizeSearchProfilesWorkflow(container).run({
    input: { mode: "normal" },
  })
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
}
