import type { MedusaContainer } from "@medusajs/framework/types"
import { synchronizeSearchProfilesWorkflow } from "../workflows/meilisearch/workflows/synchronize-search-profiles"

export default async function meilisearchFullSyncJob(
  container: MedusaContainer
) {
  await synchronizeSearchProfilesWorkflow(container).run({
    input: { mode: "full" },
  })
}

export const config = {
  name: "meilisearch-full-sync",
  schedule: "0 3 * * *",
}
