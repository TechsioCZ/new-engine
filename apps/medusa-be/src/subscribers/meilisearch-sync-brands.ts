import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { syncMeilisearchBrandsWorkflow } from "../workflows/meilisearch/workflows/sync-brands"

export default async function meilisearchSyncBrandsHandler({
  container,
}: SubscriberArgs) {
  await syncMeilisearchBrandsWorkflow(container).run({
    input: {},
  })
}

export const config: SubscriberConfig = {
  event: "meilisearch.sync",
}
