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
}: LoaderOptions) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const qrPaymentConfigService = container.resolve<QrPaymentConfigServiceType>(
    "qrPaymentConfigService"
  )

  const [, count] = await qrPaymentConfigService.listAndCount({})
  if (count > 0) {
    logger.debug("QR payment: Config already exists, skipping")
    return
  }

  try {
    await qrPaymentConfigService.create({})
    logger.info("QR payment: Created default config")
  } catch (error) {
    const errorMessage = String(error)
    if (
      errorMessage.includes("unique constraint") ||
      errorMessage.includes("duplicate key")
    ) {
      logger.debug("QR payment: Config created by another process")
      return
    }
    throw error
  }
}
