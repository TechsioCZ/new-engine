import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { LoaderOptions } from "@medusajs/framework/types"
import type { GLSEnvironment } from "../types"

type GLSConfigServiceType = {
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
  create: (data: Record<string, unknown>) => Promise<unknown>
  update: (data: Record<string, unknown>) => Promise<unknown>
}

/**
 * Creates a default gls_config row for the current environment on module init.
 * Admin enables and fills credentials later via Settings → GLS.
 */
export default async function createDefaultConfigLoader({
  container,
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const glsConfigService =
    container.resolve<GLSConfigServiceType>("glsConfigService")
  const environments: GLSEnvironment[] = ["testing", "production"]

  for (const environment of environments) {
    const [, count] = await glsConfigService.listAndCount({ environment })
    if (count > 0) {
      continue
    }

    try {
      await glsConfigService.create({ environment, is_active: environment === "testing", supported_countries: [] })
      logger.info(`GLS: Created ${environment} profile (disabled)`)
    } catch (error) {
      const errorMessage = String(error)
      if (errorMessage.includes("unique constraint")) {
        continue
      }
      if (errorMessage.includes("duplicate key")) {
        continue
      }

      throw error
    }
  }

  const [, activeCount] = await glsConfigService.listAndCount({ is_active: true })
  if (activeCount > 0) {
    return
  }

  const [testingProfiles] = await glsConfigService.listAndCount({ environment: "testing" })
  const testingProfile = testingProfiles[0] as { id?: string } | undefined
  if (!testingProfile?.id) {
    throw new Error("GLS testing profile was not initialized")
  }

  await glsConfigService.update({ id: testingProfile.id, is_active: true })
}
