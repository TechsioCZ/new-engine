import type { LoaderOptions } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import type { PplEnvironment } from "../types"

type PplConfigServiceType = {
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
  create: (data: Record<string, unknown>) => Promise<unknown>
  update: (data: Record<string, unknown>) => Promise<unknown>
}

function resolveProfileId(value: unknown): string | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    value.id.length === 0
  ) {
    return null
  }

  return value.id
}

export default async function createDefaultConfigLoader({
  container,
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const environments: PplEnvironment[] = ["testing", "production"]

  const pplConfigService =
    container.resolve<PplConfigServiceType>("pplConfigService")

  for (const environment of environments) {
    const [, count] = await pplConfigService.listAndCount({ environment })
    if (count > 0) {
      continue
    }

    try {
      await pplConfigService.create({ environment, is_active: false })
      logger.info(`PPL: Created ${environment} profile (disabled)`)
    } catch (error) {
      const errorMessage = String(error)
      if (
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("duplicate key")
      ) {
        continue
      }
      throw error
    }
  }

  const [, activeCount] = await pplConfigService.listAndCount({
    is_active: true,
  })
  if (activeCount > 0) {
    return
  }

  const [testingProfiles] = await pplConfigService.listAndCount({
    environment: "testing",
  })
  const testingProfileId = resolveProfileId(testingProfiles[0])
  if (testingProfileId === null) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PPL testing profile was not initialized"
    )
  }

  await pplConfigService.update({ id: testingProfileId, is_active: true })
}
