import type { MedusaContainer } from "@medusajs/framework"
import type { ExecArgs } from "@medusajs/framework/types"
import { isMeilisearchEnabled } from "../modules/meilisearch/env"
import { syncMeilisearchProducersWorkflow } from "../workflows/meilisearch/workflows/sync-producers"

const resolveContainer = (
  input: MedusaContainer | ExecArgs
): MedusaContainer => ("container" in input ? input.container : input)

export default async function meilisearchProducersIndexJob(
  input: MedusaContainer | ExecArgs
) {
  const container = resolveContainer(input)
  const logger = container.resolve("logger")

  if (!isMeilisearchEnabled()) {
    logger.info("Skipping producer indexing because Meilisearch is disabled")
    return
  }

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
