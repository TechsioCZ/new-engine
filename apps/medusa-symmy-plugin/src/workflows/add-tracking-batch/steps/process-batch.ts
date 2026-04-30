import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  AddTrackingBatchInput,
  AddTrackingBatchOutput,
  AddTrackingBatchResult,
  TrackingShipmentInput,
} from "../types"
import { TrackingBatchClient, type TrackingOrderCache } from "./client"

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

const getOrderIdentifier = (shipment: TrackingShipmentInput) => {
  if (shipment.identifier_type === "display_id") {
    return shipment.display_id ?? ""
  }
  if (shipment.identifier_type === "order_id") {
    return shipment.order_id ?? ""
  }
  return shipment.erp_id ?? ""
}

const processShipmentForBatch = async ({
  client,
  createdBy,
  logger,
  orderCache,
  shipment,
}: {
  client: TrackingBatchClient
  createdBy?: string
  logger: Logger
  orderCache: TrackingOrderCache
  shipment: TrackingShipmentInput
}): Promise<AddTrackingBatchResult> => {
  const orderIdentifier = getOrderIdentifier(shipment)
  try {
    const order = client.findExistingOrder(shipment, orderCache)
    if (!order) {
      return {
        order_identifier: orderIdentifier,
        status: "not_found",
        error: "Order was not found",
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
      order_identifier: orderIdentifier,
      status: "success",
      order_id: order.id,
      fulfillment_id: result.fulfillmentId,
      shipment_id: result.shipmentId,
      notification_sent: result.notificationSent,
    }
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to add tracking (${shipment.identifier_type}:${orderIdentifier}): ${message}`
    )
    return {
      order_identifier: orderIdentifier,
      status: "failed",
      error: message,
    }
  }
}

export const processTrackingBatchStep = createStep(
  "symmy-process-tracking-batch",
  async (input: AddTrackingBatchInput, { container }) => {
    const client = new TrackingBatchClient(container)
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const orderCache = await client.preload(input.shipments)

    const results: AddTrackingBatchResult[] = []
    for (const shipment of input.shipments) {
      results.push(
        await processShipmentForBatch({
          client,
          createdBy: input.created_by,
          logger,
          orderCache,
          shipment,
        })
      )
    }

    const processed = results.filter((r) => r.status === "success").length
    const failed = results.length - processed

    const output: AddTrackingBatchOutput = {
      success: failed === 0,
      processed,
      failed,
      results,
    }
    return new StepResponse(output)
  }
)
