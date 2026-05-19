import type { LoaderOptions } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type QrPaymentConfigServiceType = {
  create: (data: Record<string, unknown>) => Promise<unknown>
  listAndCount: (
    filter: Record<string, unknown>
  ) => Promise<[unknown[], number]>
}

export default async function createDefaultConfigLoader({
  container,
  options,
}: LoaderOptions<{ environment: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const environment = options?.environment ?? "development"

  const qrPaymentConfigService = container.resolve<QrPaymentConfigServiceType>(
    "qrPaymentConfigService"
  )

  const [, count] = await qrPaymentConfigService.listAndCount({ environment })
  if (count > 0) {
    logger.debug(
      `QR payment: Config for ${environment} already exists, skipping`
    )
    return
  }

  try {
    await qrPaymentConfigService.create({ environment })
    logger.info(`QR payment: Created default config for ${environment}`)
  } catch (error) {
    const errorMessage = String(error)
    if (
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("duplicate key")
    ) {
      logger.debug(
        `QR payment: Config for ${environment} created by another process`
      )
      return
    }
    throw error
  }
}
