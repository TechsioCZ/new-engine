import type { MedusaContainer } from "@medusajs/framework/types"

import { synchronizeSearchProfiles } from "../modules/meilisearch/synchronize"

export default async function meilisearchSearchProfilesIndexJob(
  container: MedusaContainer,
) {
  await synchronizeSearchProfiles(container, "normal")
}

export const config = {
  name: "meilisearch-search-profiles-index",
  numberOfExecutions: 1,
  schedule: "* * * * *",
}
