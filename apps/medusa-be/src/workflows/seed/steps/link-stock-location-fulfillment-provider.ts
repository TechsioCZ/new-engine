import type { Link } from "@medusajs/framework/modules-sdk"
import type { Logger, StockLocationDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export interface LinkStockLocationFulfillmentProviderStepInput {
  stockLocations: StockLocationDTO[]
  fulfillmentProviderIds?: (string | null | undefined)[]
}

const LinkStockLocationFulfillmentProviderStepId =
  "link-stock-location-fulfillment-provider-seed-step"

const normalizeFulfillmentProviderIds = (
  ids?: (string | null | undefined)[],
): string[] => [
  ...new Set(
    (ids ?? [])
      .map((id) => id?.toString().trim())
      .filter((id): id is string => Boolean(id)),
  ),
]

export const linkStockLocationFulfillmentProviderSeedStep = createStep(
  LinkStockLocationFulfillmentProviderStepId,
  async (
    input: LinkStockLocationFulfillmentProviderStepInput,
    { container },
  ) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    logger.info("Linking stock locations to fulfillment providers...")

    const result: unknown[] = []
    const providerIds = normalizeFulfillmentProviderIds(
      input.fulfillmentProviderIds,
    )
    if (providerIds.length === 0) {
      logger.warn(
        "No fulfillment provider IDs supplied, skipping stock-location fulfillment-provider links.",
      )
      return new StepResponse({
        result,
      })
    }

    const createLinkAt = async (
      stockLocationIndex: number,
      providerIndex: number,
    ): Promise<void> => {
      const stockLocation = input.stockLocations[stockLocationIndex]
      if (stockLocation === undefined) {
        return
      }

      const providerId = providerIds[providerIndex]
      if (providerId === undefined) {
        await createLinkAt(stockLocationIndex + 1, 0)
        return
      }

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
            "Cannot create multiple links between 'stock_location' and 'fulfillment'",
          )
        ) {
          logger.warn(
            `Skipping existing stock location -> fulfillment provider link for stock location "${stockLocation.id}" and provider "${providerId}"`,
          )
        } else {
          throw error
        }
      }

      await createLinkAt(stockLocationIndex, providerIndex + 1)
    }

    await createLinkAt(0, 0)

    return new StepResponse({
      result,
    })
  },
)
