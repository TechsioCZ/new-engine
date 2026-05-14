import type { MedusaContainer } from "@medusajs/framework"
import { syncMeilisearchProducersWorkflow } from "../workflows/meilisearch/workflows/sync-producers"

export default async function meilisearchProducersIndexJob(
  container: MedusaContainer
) {
  const logger = container.resolve("logger")

  logger.info("Starting producer indexing...")

  const {
    result: { producers },
  } = await syncMeilisearchProducersWorkflow(container).run({
    input: {},
  })

  logger.info(`Successfully indexed ${producers.length} producers`)
}

export const config = {
  name: "meilisearch-producers-index",
  schedule: "* * * * *",
  numberOfExecutions: 1,
}
