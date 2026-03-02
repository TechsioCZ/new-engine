import type { Link } from "@medusajs/framework/modules-sdk"
import type { Logger, StockLocationDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type LinkStockLocationFulfillmentProviderStepInput = {
  stockLocations: StockLocationDTO[]
  fulfillmentProviderIds?: string[]
}

const LinkStockLocationFulfillmentProviderStepId =
  "link-stock-location-fulfillment-provider-seed-step"
export const linkStockLocationFulfillmentProviderSeedStep = createStep(
  LinkStockLocationFulfillmentProviderStepId,
  async (
    input: LinkStockLocationFulfillmentProviderStepInput,
    { container }
  ) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    logger.info("Linking stock locations to fulfillment providers...")

    const result: unknown[] = []
    const providerIds = input.fulfillmentProviderIds?.length
      ? input.fulfillmentProviderIds
      : ["manual_manual"]

    for (const stockLocation of input.stockLocations) {
      for (const providerId of providerIds) {
        try {
          const linkResult = await link.create({
            [Modules.STOCK_LOCATION]: {
              stock_location_id: stockLocation.id,
            },
            [Modules.FULFILLMENT]: {
              fulfillment_provider_id: providerId,
            },
          })

          result.push(linkResult)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (
            message.includes(
              "Cannot create multiple links between 'stock_location' and 'fulfillment'"
            )
          ) {
            logger.warn(
              `Skipping existing stock location -> fulfillment provider link for stock location "${stockLocation.id}" and provider "${providerId}"`
            )
            continue
          }
          throw error
        }
      }
    }

    return new StepResponse({
      result,
    })
  }
)
