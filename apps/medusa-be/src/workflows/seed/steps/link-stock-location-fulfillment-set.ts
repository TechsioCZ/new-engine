import type { Link } from "@medusajs/framework/modules-sdk"
import type {
  FulfillmentSetDTO,
  Logger,
  StockLocationDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export interface LinkStockLocationFulfillmentSetStepInput {
  stockLocations: StockLocationDTO[]
  fulfillmentSet: FulfillmentSetDTO
}

const LinkStockLocationFulfillmentSetStepId =
  "link-stock-location-fulfillment-set-seed-step"
const MAX_STOCK_LOCATION_LINKS = 10_000
export const linkStockLocationFulfillmentSetStep = createStep(
  LinkStockLocationFulfillmentSetStepId,
  async (input: LinkStockLocationFulfillmentSetStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const result: unknown[] = []

    logger.info("Linking stock location to fulfillment set...")

    if (input.stockLocations.length > MAX_STOCK_LOCATION_LINKS) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Refusing to link ${input.stockLocations.length} stock locations; maximum is ${MAX_STOCK_LOCATION_LINKS}.`,
      )
    }

    const createNextLink = async (index: number): Promise<void> => {
      const stockLocation = input.stockLocations[index]
      if (stockLocation === undefined) {
        return
      }

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
        if (
          error instanceof MedusaError &&
          error.type === MedusaError.Types.DUPLICATE_ERROR
        ) {
          logger.warn(
            `Skipping existing stock location -> fulfillment set link for stock location "${stockLocation.id}" and fulfillment set "${input.fulfillmentSet.id}"`,
          )
        } else {
          throw error
        }
      }

      await createNextLink(index + 1)
    }

    await createNextLink(0)

    return new StepResponse({
      result,
    })
  },
)
