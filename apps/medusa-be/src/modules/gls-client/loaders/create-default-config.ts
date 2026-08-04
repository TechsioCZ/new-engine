import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type GLSConfigServiceType = {
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
  create: (data: Record<string, unknown>) => Promise<unknown>
}

/**
 * Creates a default gls_config row for the current environment on module init.
 * Admin enables and fills credentials later via Settings → GLS.
 */
export default async function createDefaultConfigLoader({
  container,
  options,
}: LoaderOptions<{ environment: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const environment = options?.environment ?? "testing"

  const glsConfigService =
    container.resolve<GLSConfigServiceType>("glsConfigService")

  const [, count] = await glsConfigService.listAndCount({ environment })
  if (count > 0) {
    logger.debug(`GLS: Config for ${environment} already exists, skipping`)
    return
  }

  try {
    await glsConfigService.create({ environment })
    logger.info(`GLS: Created default config for ${environment} (disabled)`)
  } catch (error) {
    const errorMessage = String(error)
    if (
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("duplicate key")
    ) {
      logger.debug(`GLS: Config for ${environment} created by another process`)
      return
    }
    throw error
  }
}
