import type {
  Logger,
  SalesChannelDTO,
  StockLocationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows"

export interface LinkSalesChannelsStockLocationStepInput {
  salesChannels: SalesChannelDTO[]
  stockLocations: StockLocationDTO[]
}

const LinkSalesChannelsStockLocationStepId =
  "link-sales-channels-stock-location-seed-step"
export const linkSalesChannelsStockLocationStep = createStep(
  LinkSalesChannelsStockLocationStepId,
  async (input: LinkSalesChannelsStockLocationStepInput, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    logger.info("Linking sales channels to stock location...")

    const linkResults = await Promise.all(
      input.stockLocations.map(
        async (stockLocation) =>
          await linkSalesChannelsToStockLocationWorkflow(container).run({
            input: {
              add: input.salesChannels.map((i) => i.id),
              id: stockLocation.id,
            },
          }),
      ),
    )
    const result: unknown[] = linkResults.map((linkResult) => linkResult.result)

    // the workflow result contains nothing ... medusa wtf?

    return new StepResponse({
      result,
    })
  },
)
