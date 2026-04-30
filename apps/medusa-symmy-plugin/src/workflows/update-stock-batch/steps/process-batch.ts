import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  UpdateStockBatchInput,
  UpdateStockBatchOutput,
  UpdateStockBatchResult,
} from "../types"
import { StockBatchClient } from "./client"
import { stockBatchClientHelper } from "./client-helper"

export const processStockBatchStep = createStep(
  "symmy-process-stock-batch",
  async (input: UpdateStockBatchInput, { container }) => {
    const client = new StockBatchClient(container)
    const helper = stockBatchClientHelper
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    const results: UpdateStockBatchResult[] = new Array(input.updates.length)
    const maps = await client.preload(input)
    const resolved = helper.resolveUpdates(input.updates, maps, results)
    const existingLevels = await client.loadExistingLevels(resolved)
    const payload = helper.buildBatchPayload(resolved, existingLevels)

    try {
      const { created, updated } = await client.applyBatch(payload)
      helper.fillResultsFromLevels(
        payload.createOwners,
        created,
        existingLevels,
        results
      )
      helper.fillResultsFromLevels(
        payload.updateOwners,
        updated,
        existingLevels,
        results
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"
      logger.warn(`[symmy-plugin] Failed to apply inventory batch: ${message}`)
      for (const owner of [...payload.createOwners, ...payload.updateOwners]) {
        results[owner.index] = {
          identifier_type: owner.input.identifier_type,
          identifier: owner.identifier,
          status: "failed",
          inventory_item_id: owner.inventoryItemId,
          error: message,
        }
      }
    }

    const updatedCount = results.filter((r) => r?.status === "updated").length
    const failed = results.length - updatedCount

    const output: UpdateStockBatchOutput = {
      success: failed === 0,
      updated: updatedCount,
      failed,
      results,
    }
    return new StepResponse(output)
  }
)
