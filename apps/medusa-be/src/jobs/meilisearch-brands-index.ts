import type { MedusaContainer } from "@medusajs/framework"
import type {
  ExecArgs,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { isMeilisearchEnabled } from "../modules/meilisearch/env"
import { syncMeilisearchBrandsWorkflow } from "../workflows/meilisearch/workflows/sync-brands"

const resolveContainer = (
  input: MedusaContainer | ExecArgs
): MedusaContainer => ("container" in input ? input.container : input)

export default async function meilisearchBrandsIndexJob(
  input: MedusaContainer | ExecArgs
) {
  const container = resolveContainer(input)
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (!isMeilisearchEnabled()) {
    logger.info("Skipping brand indexing because Meilisearch is disabled")
    return
  }

  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  await lockingModule.execute(
    "meilisearch-brands-index-job",
    async () => {
      logger.info("Starting brand indexing...")

      const {
        result: { brands },
      } = await syncMeilisearchBrandsWorkflow(container).run({
        input: {},
      })

      logger.info(`Successfully indexed ${brands.length} brands`)
    },
    { timeout: 120 }
  )
}

export const config = {
  name: "meilisearch-brands-index",
  schedule: "* * * * *",
  numberOfExecutions: 1,
}
