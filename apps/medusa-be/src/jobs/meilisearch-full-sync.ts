import type { MedusaContainer } from "@medusajs/framework/types"

import { synchronizeSearchProfiles } from "../modules/meilisearch/synchronize"

export default async function meilisearchFullSyncJob(
  container: MedusaContainer,
) {
  await synchronizeSearchProfiles(container, "full")
}

export const config = {
  name: "meilisearch-full-sync",
  schedule: "0 3 * * *",
}
