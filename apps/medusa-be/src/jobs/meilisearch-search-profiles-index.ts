import type { MedusaContainer } from "@medusajs/framework/types"
import { synchronizeSearchProfilesWorkflow } from "../workflows/meilisearch/workflows/synchronize-search-profiles"

export default async function meilisearchSearchProfilesIndexJob(
  container: MedusaContainer
) {
  await synchronizeSearchProfilesWorkflow(container).run({
    input: { mode: "normal" },
  })
}

export const config = {
  name: "meilisearch-search-profiles-index",
  schedule: "* * * * *",
  numberOfExecutions: 1,
}
