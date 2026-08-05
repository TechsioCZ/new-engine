import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { TrackingBatchClient } from "../client"
import type { TrackingOrderIndex } from "../client"
import { trackingBatchClientMapperHelper } from "../client-mapper-helper"
import type {
  AddTrackingBatchInput,
  AddTrackingBatchOutput,
  AddTrackingBatchResult,
  TrackingShipmentInput,
} from "../types"

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message)
  }
  if (typeof error === "string") {
    return error
  }
  return "Unknown error"
}

const processShipmentForBatch = async ({
  client,
  createdBy,
  logger,
  orderIndex,
  shipment,
}: {
  client: TrackingBatchClient
  createdBy?: string | undefined
  logger: Logger
  orderIndex: TrackingOrderIndex
  shipment: TrackingShipmentInput
}): Promise<AddTrackingBatchResult> => {
  const orderIdentifier =
    trackingBatchClientMapperHelper.getOrderIdentifier(shipment)
  try {
    const order = client.findExistingOrder(shipment, orderIndex)
    if (!order) {
      return {
        error: "Order was not found",
        order_identifier: orderIdentifier,
        status: "not_found",
      }
    }

    const items = client.resolveItems(order, shipment.items)
    const result = await client.createFulfillmentAndShipment({
      createdBy,
      items,
      order,
      shipment,
    })

    return {
      fulfillment_id: result.fulfillmentId,
      notification_sent: result.notificationSent,
      order_id: order.id,
      order_identifier: orderIdentifier,
      shipment_id: result.shipmentId,
      status: "success",
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to add tracking (${shipment.identifier_type}:${orderIdentifier}): ${message}`,
    )
    return {
      error: message,
      order_identifier: orderIdentifier,
      status: "failed",
    }
  }
}

export const symmyProcessTrackingBatchStep = createStep(
  "symmy-process-tracking-batch",
  async (input: AddTrackingBatchInput, { container }) => {
    const client = new TrackingBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const orderIndex = await client.preload(input.shipments)

    const results: AddTrackingBatchResult[] = []
    for (const shipment of input.shipments) {
      results.push(
        await processShipmentForBatch({
          client,
          createdBy: input.created_by,
          logger,
          orderIndex,
          shipment,
        }),
      )
    }

    const processed = results.filter((r) => r.status === "success").length
    const failed = results.length - processed

    const output: AddTrackingBatchOutput = {
      failed,
      processed,
      results,
      success: failed === 0,
    }
    return new StepResponse(output)
  },
)
