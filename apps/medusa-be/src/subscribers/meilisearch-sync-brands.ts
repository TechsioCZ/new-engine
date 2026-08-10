import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { synchronizeSearchProfiles } from "../modules/meilisearch/synchronize"
import { syncMeilisearchBrandsWorkflow } from "../workflows/meilisearch/workflows/sync-brands"

export default async function meilisearchSyncBrandsHandler({
  container,
}: SubscriberArgs) {
  await syncMeilisearchBrandsWorkflow(container).run({
    input: {},
  })
  await synchronizeSearchProfiles(container, "normal")
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
}
