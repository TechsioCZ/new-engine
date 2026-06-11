import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  FulfillmentSetDTO,
  Logger,
  StockLocationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export type LinkStockLocationFulfillmentSetStepInput = {
  stockLocations: StockLocationDTO[]
  fulfillmentSet: FulfillmentSetDTO
}

const LinkStockLocationFulfillmentSetStepId =
  "link-stock-location-fulfillment-set-seed-step"
export const linkStockLocationFulfillmentSetStep = createStep(
  LinkStockLocationFulfillmentSetStepId,
  async (input: LinkStockLocationFulfillmentSetStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const result: unknown[] = []

    logger.info("Linking stock location to fulfillment set...")

    for (const stockLocation of input.stockLocations) {
      try {
        const linkResult = await link.create({
          [Modules.STOCK_LOCATION]: {
            stock_location_id: stockLocation.id,
          },
          [Modules.FULFILLMENT]: {
            fulfillment_set_id: input.fulfillmentSet.id,
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
            `Skipping existing stock location -> fulfillment set link for stock location "${stockLocation.id}" and fulfillment set "${input.fulfillmentSet.id}"`
          )
          continue
        }
        throw error
      }
    }

    return new StepResponse({
      result,
    })
  }
)
