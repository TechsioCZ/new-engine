import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

interface PplConfigEnvironmentInput {
  environment: string
}

interface PplConfigServiceType {
  listAndCount: (
    filter: PplConfigEnvironmentInput,
  ) => Promise<[unknown[], number]>
  create: (data: PplConfigEnvironmentInput) => Promise<unknown>
}

/**
 * Creates a default PPL config row for the current environment if one doesn't exist.
 *
 * This loader runs during module initialization, before the main service is instantiated.
 * It uses the auto-generated internal `pplConfigService` to create a disabled config row.
 *
 * The admin can then configure and enable PPL via Settings → PPL.
 */
export default async function createDefaultConfigLoader({
  container,
  options,
}: LoaderOptions<{ environment: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const environment = options?.environment ?? "testing"

  // Resolve the auto-generated internal service for PplConfig model
  // (MedusaService generates `{modelName}Service` for each model)
  const pplConfigService =
    container.resolve<PplConfigServiceType>("pplConfigService")

  // Check if config for this environment already exists
  const [, count] = await pplConfigService.listAndCount({ environment })
  if (count > 0) {
    logger.debug(`PPL: Config for ${environment} already exists, skipping`)
    return
  }

  // Create default config row (disabled by default, admin must enable)
  // Use try-catch to handle race condition when multiple containers start simultaneously
  try {
    await pplConfigService.create({ environment })
    logger.info(`PPL: Created default config for ${environment} (disabled)`)
  } catch (error) {
    // Ignore unique constraint violation (another container created it first)
    const errorMessage = String(error)
    if (
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("duplicate key")
    ) {
      logger.debug(`PPL: Config for ${environment} created by another process`)
      return
    }
    throw error
  }
}
