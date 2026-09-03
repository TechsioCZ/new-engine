import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { bootstrapFourMarketSearchProfilesWorkflow } from "../workflows/search-profile/workflows/bootstrap-four-market-search-profiles"

export default async function bootstrapFourMarketSearchProfiles({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const { result } = await bootstrapFourMarketSearchProfilesWorkflow(
    container
  ).run({ input: {} })

  logger.info(
    `Four-market SearchProfile bootstrap complete: created=${result.created}, updated=${result.updated}, unchanged=${result.unchanged}, profiles=${result.profile_keys.join(",")}`
  )
}
