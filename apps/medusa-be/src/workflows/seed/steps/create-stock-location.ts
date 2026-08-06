import type {
  IStockLocationService,
  Logger,
  StockLocationDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createStockLocationsWorkflow,
  updateStockLocationsWorkflow,
} from "@medusajs/medusa/core-flows"

export interface CreateStockLocationStepInput {
  locations: {
    name: string
    address: {
      city: string
      country_code: string
      address_1: string
    }
  }[]
}

const CreateStockLocationStepId = "create-stock-location-seed-step"
export const createStockLocationSeedStep = createStep(
  CreateStockLocationStepId,
  async (input: CreateStockLocationStepInput, { container }) => {
    const result: StockLocationDTO[] = []

    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const stockLocationService = container.resolve<IStockLocationService>(
      Modules.STOCK_LOCATION,
    )

    const existingStockLocations =
      await stockLocationService.listStockLocations({
        name: {
          $in: input.locations.map((i) => i.name),
        },
      })

    const missingStockLocations = input.locations.filter(
      (i) => !existingStockLocations.some((j) => j.name === i.name),
    )
    const updateStockLocations = existingStockLocations.flatMap(
      (existingLocation) => {
        const inputLocation = input.locations.find(
          (loc) => loc.name === existingLocation.name,
        )
        if (inputLocation) {
          return [
            {
              ...existingLocation,
              address: inputLocation.address,
            },
          ]
        }
        return []
      },
    )

    if (missingStockLocations.length !== 0) {
      logger.info("Creating missing stock locations ...")

      const { result: createResult } = await createStockLocationsWorkflow(
        container,
      ).run({
        input: {
          locations: missingStockLocations,
        },
      })

      for (const resultElement of createResult) {
        result.push(resultElement)
      }
    }
    if (updateStockLocations.length !== 0) {
      logger.info("Updating existing stock locations ...")

      const toUpdate = updateStockLocations.map((i) => ({
        selector: { name: { $in: [i.name] } },
        update: {
          address: i.address,
        },
      }))

      const updateResults = await Promise.all(
        toUpdate.map(async (stockLocationToUpdate) => {
          const { result: updateResult } = await updateStockLocationsWorkflow(
            container,
          ).run({
            input: stockLocationToUpdate,
          })
          const [updatedLocation] = Array.isArray(updateResult)
            ? updateResult
            : [updateResult]
          return updatedLocation
        }),
      )

      result.push(
        ...updateResults.filter(
          (location): location is StockLocationDTO => location !== undefined,
        ),
      )
    }

    return new StepResponse({
      result,
    })
  },
)
