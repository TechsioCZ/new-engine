import type {
  CreateInventoryLevelInput,
  IInventoryService,
  InventoryLevelDTO,
  Logger,
  Query,
  StockLocationDTO,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
} from "@medusajs/medusa/core-flows"

export type CreateInventoryLevelsStepInput = {
  stockLocations: StockLocationDTO[]
  inventoryItems: {
    sku: string
    quantity?: number
    locations?: {
      stockLocationName: string
      quantity: number
    }[]
  }[]
}

type ResolvedInventoryItemInput =
  CreateInventoryLevelsStepInput["inventoryItems"][number] & {
    id?: string
  }

function buildInventoryLevelsForItem(
  inventoryItem: ResolvedInventoryItemInput,
  stockLocations: StockLocationDTO[]
): CreateInventoryLevelInput[] {
  if (inventoryItem.id === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Inventory item with sku ${inventoryItem.sku} not found.`
    )
  }
  const inventoryItemId = inventoryItem.id

  if (inventoryItem.locations?.length) {
    return inventoryItem.locations.map((locationQuantity) => {
      const stockLocation = stockLocations.find(
        (location) => location.name === locationQuantity.stockLocationName
      )
      if (!stockLocation) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Stock location "${locationQuantity.stockLocationName}" not found for SKU ${inventoryItem.sku}.`
        )
      }

      return {
        location_id: stockLocation.id,
        stocked_quantity: locationQuantity.quantity,
        inventory_item_id: inventoryItemId,
      }
    })
  }

  if (inventoryItem.quantity === undefined) {
    return []
  }
  const quantity = inventoryItem.quantity

  return stockLocations.map((stockLocation) => ({
    location_id: stockLocation.id,
    stocked_quantity: quantity,
    inventory_item_id: inventoryItemId,
  }))
}

const CreateInventoryLevelsStepId = "create-inventory-levels-seed-step"
export const createInventoryLevelsStep = createStep(
  CreateInventoryLevelsStepId,
  async (input: CreateInventoryLevelsStepInput, { container }) => {
    const result: InventoryLevelDTO[] = []
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const inventoryLevelService = container.resolve<IInventoryService>(
      Modules.INVENTORY
    )

    logger.info("Creating inventory levels...")

    const { data: inventoryItems } = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku"],
    })

    const inventoryItemsMap = input.inventoryItems.map((ii) => {
      const inventoryItem = inventoryItems.find((i) => i.sku === ii.sku)
      return {
        id: inventoryItem?.id,
        sku: ii.sku,
        quantity: ii.quantity,
        locations: ii.locations,
      }
    })

    const inventoryLevels: CreateInventoryLevelInput[] = []
    for (const inventoryItem of inventoryItemsMap) {
      inventoryLevels.push(
        ...buildInventoryLevelsForItem(inventoryItem, input.stockLocations)
      )
    }

    logger.info("Checking for existing inventory levels...")

    const existingInventoryLevels =
      await inventoryLevelService.listInventoryLevels({
        location_id: input.stockLocations.map((l) => l.id),
        inventory_item_id: inventoryItems.map((i) => i.id),
      })

    const missingInventoryLevels = inventoryLevels.filter(
      (il) =>
        !existingInventoryLevels.find(
          (eil) =>
            eil.inventory_item_id === il.inventory_item_id &&
            eil.location_id === il.location_id
        )
    )
    const updateInventoryLevels = existingInventoryLevels.flatMap((eil) => {
      const inputInventoryLevel = inventoryLevels.find(
        (il) =>
          eil.inventory_item_id === il.inventory_item_id &&
          eil.location_id === il.location_id
      )
      if (inputInventoryLevel !== undefined) {
        return [
          {
            location_id: eil.location_id,
            inventory_item_id: eil.inventory_item_id,
            stocked_quantity: inputInventoryLevel.stocked_quantity,
          },
        ]
      }

      return []
    })

    const CHUNK_SIZE = 1000

    if (missingInventoryLevels.length !== 0) {
      logger.info(
        `Creating ${missingInventoryLevels.length} missing inventory levels...`
      )

      for (let i = 0; i < missingInventoryLevels.length; i += CHUNK_SIZE) {
        const createResult = await createInventoryLevelsWorkflow(container).run(
          {
            input: {
              inventory_levels: missingInventoryLevels.slice(i, i + CHUNK_SIZE),
            },
          }
        )
        for (const resultElement of createResult.result) {
          result.push(resultElement)
        }
      }
    }

    if (updateInventoryLevels.length !== 0) {
      logger.info(
        `Updating ${updateInventoryLevels.length} existing inventory levels...`
      )

      for (let i = 0; i < updateInventoryLevels.length; i += CHUNK_SIZE) {
        const updateResult = await updateInventoryLevelsWorkflow(container).run(
          {
            input: {
              updates: updateInventoryLevels.slice(i, i + CHUNK_SIZE),
            },
          }
        )

        for (const resultElement of updateResult.result) {
          result.push(resultElement)
        }
      }
    }

    return new StepResponse({
      result,
    })
  }
)
