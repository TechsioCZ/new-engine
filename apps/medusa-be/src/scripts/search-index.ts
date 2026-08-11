import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { synchronizeSearchProfilesWorkflow } from "../workflows/meilisearch/workflows/synchronize-search-profiles"

export default async function searchIndexScript({ container }: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const mode = process.argv.includes("--full") ? "full" : "normal"
  const { result } = await synchronizeSearchProfilesWorkflow(container).run({
    input: { mode },
  })

  logger.info(
    "Meilisearch search-profile sync complete: mode=" +
      result.mode +
      ", profiles=" +
      result.profiles +
      ", indexed=" +
      result.indexed +
      ", deleted=" +
      result.deleted
  )
}
