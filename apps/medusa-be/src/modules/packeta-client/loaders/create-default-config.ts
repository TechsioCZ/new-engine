import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PacketaConfigServiceType = {
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
  create: (data: Record<string, unknown>) => Promise<unknown>
}

/**
 * Creates a default packeta_config row for the current environment on module init.
 * Admin enables and fills credentials later via Settings → Packeta.
 */
export default async function createDefaultConfigLoader({
  container,
  options,
}: LoaderOptions<{ environment: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const environment = options?.environment || "testing"

  const packetaConfigService = container.resolve<PacketaConfigServiceType>(
    "packetaConfigService"
  )

  const [, count] = await packetaConfigService.listAndCount({ environment })
  if (count > 0) {
    logger.debug(`Packeta: Config for ${environment} already exists, skipping`)
    return
  }

  try {
    await packetaConfigService.create({ environment })
    logger.info(`Packeta: Created default config for ${environment} (disabled)`)
  } catch (error) {
    const errorMessage = String(error)
    if (
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("duplicate key")
    ) {
      logger.debug(
        `Packeta: Config for ${environment} created by another process`
      )
      return
    }
    throw error
  }
}
