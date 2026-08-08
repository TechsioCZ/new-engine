import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { synchronizeSearchProfiles } from "../modules/meilisearch/synchronize"

export default async function searchIndexScript({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const mode = process.argv.includes("--full") ? "full" : "normal"
  const result = await synchronizeSearchProfiles(container, mode)

  logger.info(
    `Meilisearch search-profile sync complete: mode=${result.mode}, profiles=${
      result.profiles
    }, indexed=${result.indexed}, deleted=${result.deleted}`,
  )
}
