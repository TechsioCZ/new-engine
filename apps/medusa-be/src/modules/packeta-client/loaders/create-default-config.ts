import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { PacketaEnvironment } from "../types"

type PacketaConfigServiceType = {
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
  create: (data: Record<string, unknown>) => Promise<unknown>
  update: (data: Record<string, unknown>) => Promise<unknown>
}

export default async function createDefaultConfigLoader({
  container,
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const packetaConfigService = container.resolve<PacketaConfigServiceType>(
    "packetaConfigService"
  )
  const environments: PacketaEnvironment[] = ["testing", "production"]

  for (const environment of environments) {
    const [, count] = await packetaConfigService.listAndCount({ environment })
    if (count > 0) {
      continue
    }

    try {
      await packetaConfigService.create({
        environment,
        is_active: environment === "testing",
        widget_countries: [],
      })
      logger.info(`Packeta: Created ${environment} profile (disabled)`)
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

  const [, activeCount] = await packetaConfigService.listAndCount({
    is_active: true,
  })
  if (activeCount > 0) {
    return
  }

  const [testingProfiles] = await packetaConfigService.listAndCount({
    environment: "testing",
  })
  const testingProfile = testingProfiles[0] as { id?: string } | undefined
  if (testingProfile?.id) {
    await packetaConfigService.update({
      id: testingProfile.id,
      is_active: true,
    })
  }
}
