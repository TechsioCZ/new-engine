import type { ExecArgs, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ensureDefaultMeasurementUnitTranslations } from "./measurement-unit-translations"

export default async function backfillMeasurementUnitTranslations({
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const result = await ensureDefaultMeasurementUnitTranslations(container)

  logger.info(
    `Measurement-unit translation backfill: ${result.created} created, ${result.updated} updated`
  )
  if (result.unavailableLocaleCodes.length) {
    logger.warn(
      `Measurement-unit translations skipped for unavailable locales: ${result.unavailableLocaleCodes.join(", ")}`
    )
  }
}
