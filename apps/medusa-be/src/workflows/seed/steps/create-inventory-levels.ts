import type {
  CreateInventoryLevelInput,
  IInventoryService,
  UpdateInventoryLevelInput,
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
import { chunk } from "@techsio/std/array"
import { isRecord } from "@techsio/std/object"

export interface CreateInventoryLevelsStepInput {
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
    id?: string | undefined
  }

const buildInventoryLevelsForItem = (
  inventoryItem: ResolvedInventoryItemInput,
  stockLocations: StockLocationDTO[],
): CreateInventoryLevelInput[] => {
  if (inventoryItem.id === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Inventory item with sku ${inventoryItem.sku} not found.`,
    )
  }
  const inventoryItemId = inventoryItem.id

  if (
    inventoryItem.locations !== undefined &&
    inventoryItem.locations.length > 0
  ) {
    return inventoryItem.locations.map((locationQuantity) => {
      const stockLocation = stockLocations.find(
        (location) => location.name === locationQuantity.stockLocationName,
      )
      if (stockLocation === undefined) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Stock location "${locationQuantity.stockLocationName}" not found for SKU ${inventoryItem.sku}.`,
        )
      }

      return {
        inventory_item_id: inventoryItemId,
        location_id: stockLocation.id,
        stocked_quantity: locationQuantity.quantity,
      }
    })
  }

  if (inventoryItem.quantity === undefined) {
    return []
  }
  const { quantity } = inventoryItem

  return stockLocations.map((stockLocation) => ({
    inventory_item_id: inventoryItemId,
    location_id: stockLocation.id,
    stocked_quantity: quantity,
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
      Modules.INVENTORY,
    )

    logger.info("Creating inventory levels...")

    const inventoryResponse: unknown = await query.graph({
      entity: "inventory_item",
      fields: ["id", "sku"],
    })
    const inventoryData = isRecord(inventoryResponse)
      ? inventoryResponse["data"]
      : undefined
    const inventoryItems = Array.isArray(inventoryData)
      ? inventoryData.flatMap((item) =>
          isRecord(item) &&
          typeof item["id"] === "string" &&
          typeof item["sku"] === "string"
            ? [{ id: item["id"], sku: item["sku"] }]
            : [],
        )
      : []

    const inventoryItemsMap = input.inventoryItems.map((ii) => {
      const inventoryItem = inventoryItems.find((item) => item.sku === ii.sku)
      return {
        id: inventoryItem?.id,
        sku: ii.sku,
        ...(ii.quantity === undefined ? {} : { quantity: ii.quantity }),
        ...(ii.locations === undefined ? {} : { locations: ii.locations }),
      }
    })

    const inventoryLevels: CreateInventoryLevelInput[] = []
    for (const inventoryItem of inventoryItemsMap) {
      inventoryLevels.push(
        ...buildInventoryLevelsForItem(inventoryItem, input.stockLocations),
      )
    }

    logger.info("Checking for existing inventory levels...")

    const existingInventoryLevels =
      await inventoryLevelService.listInventoryLevels({
        inventory_item_id: inventoryItems.map((i) => i.id),
        location_id: input.stockLocations.map((l) => l.id),
      })

    const missingInventoryLevels = inventoryLevels.filter(
      (il) =>
        !existingInventoryLevels.some(
          (eil) =>
            eil.inventory_item_id === il.inventory_item_id &&
            eil.location_id === il.location_id,
        ),
    )
    const updateInventoryLevels: UpdateInventoryLevelInput[] =
      existingInventoryLevels.flatMap((eil) => {
        const inputInventoryLevel = inventoryLevels.find(
          (il) =>
            eil.inventory_item_id === il.inventory_item_id &&
            eil.location_id === il.location_id,
        )
        if (inputInventoryLevel?.stocked_quantity !== undefined) {
          return [
            {
              inventory_item_id: eil.inventory_item_id,
              location_id: eil.location_id,
              stocked_quantity: inputInventoryLevel.stocked_quantity,
            },
          ]
        }

        return []
      })

    const CHUNK_SIZE = 1000

    if (missingInventoryLevels.length !== 0) {
      logger.info(
        `Creating ${missingInventoryLevels.length} missing inventory levels...`,
      )

      const createChunks = chunk(missingInventoryLevels, CHUNK_SIZE)
      const createChunk = async (
        chunkIndex: number,
        accumulated: InventoryLevelDTO[],
      ): Promise<InventoryLevelDTO[]> => {
        const inventoryLevelsChunk = createChunks[chunkIndex]
        if (inventoryLevelsChunk === undefined) {
          return accumulated
        }
        const createResult = await createInventoryLevelsWorkflow(container).run(
          {
            input: { inventory_levels: inventoryLevelsChunk },
          },
        )
        return await createChunk(chunkIndex + 1, [
          ...accumulated,
          ...createResult.result,
        ])
      }
      const created = await createChunk(0, [])
      result.push(...created)
    }

    if (updateInventoryLevels.length !== 0) {
      logger.info(
        `Updating ${updateInventoryLevels.length} existing inventory levels...`,
      )

      const updateChunks = chunk(updateInventoryLevels, CHUNK_SIZE)
      const updateChunk = async (
        chunkIndex: number,
        accumulated: InventoryLevelDTO[],
      ): Promise<InventoryLevelDTO[]> => {
        const inventoryLevelsChunk = updateChunks[chunkIndex]
        if (inventoryLevelsChunk === undefined) {
          return accumulated
        }
        const updateResult = await updateInventoryLevelsWorkflow(container).run(
          {
            input: { updates: inventoryLevelsChunk },
          },
        )
        return await updateChunk(chunkIndex + 1, [
          ...accumulated,
          ...updateResult.result,
        ])
      }
      const updated = await updateChunk(0, [])
      result.push(...updated)
    }

    return new StepResponse({
      result,
    })
  },
)
