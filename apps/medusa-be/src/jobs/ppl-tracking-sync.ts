import type { MedusaContainer } from "@medusajs/framework"
import type {
  IEventBusModuleService,
  IFulfillmentModuleService,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  PPL_CLIENT_MODULE,
  PPL_DELIVERED_STATES,
  PPL_FAILED_STATES,
} from "../modules/ppl-client"
import type {
  PplClientModuleService,
  PplFulfillmentData,
  PplShipmentInfo,
  PplShipmentState,
} from "../modules/ppl-client"

interface FulfillmentRecord {
  id: string
  data: PplFulfillmentData | null
  shipped_at: string | null
  delivered_at: string | null
  provider_id: string
}

interface PendingFulfillment extends FulfillmentRecord {
  data: PplFulfillmentData & { shipment_number: string }
}

interface TrackingContext {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const BATCH_SIZE = 100

const isNullableString = (value: unknown): value is string | null =>
  typeof value === "string" || value === null

const isFulfillmentRecord = (value: unknown): value is FulfillmentRecord => {
  if (typeof value !== "object" || value === null) {
    return false
  }
  if (!("id" in value) || typeof value.id !== "string") {
    return false
  }
  if (!("provider_id" in value) || typeof value.provider_id !== "string") {
    return false
  }
  if (!("shipped_at" in value) || !isNullableString(value.shipped_at)) {
    return false
  }
  if (!("delivered_at" in value) || !isNullableString(value.delivered_at)) {
    return false
  }

  return "data" in value
}

const isPendingFulfillment = (
  fulfillment: FulfillmentRecord,
): fulfillment is PendingFulfillment =>
  fulfillment.shipped_at !== null &&
  fulfillment.delivered_at === null &&
  typeof fulfillment.data?.shipment_number === "string"

const fetchPendingFulfillments = async (
  query: Query,
): Promise<PendingFulfillment[]> => {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
    filters: { provider_id: "ppl_ppl" },
  })

  const pendingFulfillments: PendingFulfillment[] = []
  for (const fulfillment of fulfillments) {
    if (isFulfillmentRecord(fulfillment) && isPendingFulfillment(fulfillment)) {
      pendingFulfillments.push(fulfillment)
    }
  }
  return pendingFulfillments
}

const handleDelivered = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService, eventBus } = ctx
  const fulfillmentData = fulfillment.data

  logger.info(
    `PPL: Shipment ${fulfillmentData.shipment_number} delivered (${newStatus})`,
  )

  const deliveredAt =
    info.deliveryDate !== undefined && info.deliveryDate !== ""
      ? new Date(info.deliveryDate)
      : new Date()

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      last_status: newStatus,
      last_status_date: info.stateDate,
    },
    delivered_at: deliveredAt,
  })

  await eventBus.emit({
    data: {
      delivered_at: deliveredAt.toISOString(),
      fulfillment_id: fulfillment.id,
      shipment_number: fulfillmentData.shipment_number,
      status: newStatus,
    },
    name: "ppl.delivered",
  })
}

const handleFailed = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService, eventBus } = ctx
  const fulfillmentData = fulfillment.data

  logger.warn(
    `PPL: Shipment ${fulfillmentData.shipment_number} failed (${newStatus})`,
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      delivery_failed: true,
      last_status: newStatus,
      last_status_date: info.stateDate,
    },
  })

  await eventBus.emit({
    data: {
      fulfillment_id: fulfillment.id,
      shipment_number: fulfillmentData.shipment_number,
      status: newStatus,
      status_date: info.stateDate,
    },
    name: "ppl.delivery_failed",
  })
}

const handleInTransit = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  logger.debug(
    `PPL: Shipment ${fulfillmentData.shipment_number} status: ${newStatus}`,
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      last_status: newStatus,
      last_status_date: info.stateDate,
    },
  })
}

const processFulfillmentStatus = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
): Promise<void> => {
  const fulfillmentData = fulfillment.data
  const currentStatus = fulfillmentData.last_status
  const newStatus = info.shipmentState

  if (currentStatus === newStatus) {
    return
  }

  ctx.logger.info(
    `PPL: Shipment ${fulfillmentData.shipment_number} status changed: ${currentStatus ?? "unknown"} -> ${newStatus}`,
  )

  if (PPL_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, info, newStatus)
  } else if (PPL_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, info, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, info, newStatus)
  }
}

const processBatch = async (
  ctx: TrackingContext,
  pplClient: PplClientModuleService,
  shipmentNumbers: string[],
  fulfillmentMap: Map<string, PendingFulfillment>,
): Promise<void> => {
  try {
    const shipmentInfos = await pplClient.getShipmentInfo({ shipmentNumbers })
    const returnedNumbers = new Set(
      shipmentInfos.map((info) => info.shipmentNumber),
    )
    const missingNumbers = shipmentNumbers.filter(
      (shipmentNumber) => !returnedNumbers.has(shipmentNumber),
    )

    if (missingNumbers.length > 0) {
      ctx.logger.warn(
        `PPL Tracking Sync: ${missingNumbers.length} shipments not found in PPL response (batch ${shipmentNumbers[0]}...): ${missingNumbers.join(", ")}`,
      )
    }

    await Promise.all(
      shipmentInfos.map(async (info) => {
        const fulfillment = fulfillmentMap.get(info.shipmentNumber)
        if (fulfillment !== undefined) {
          await processFulfillmentStatus(ctx, fulfillment, info)
        }
      }),
    )
  } catch (error) {
    ctx.logger.warn(
      `PPL Tracking Sync: Failed to fetch batch status: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

const processFulfillmentsInBatches = async (
  ctx: TrackingContext,
  pplClient: PplClientModuleService,
  fulfillments: PendingFulfillment[],
): Promise<void> => {
  const fulfillmentMap = new Map(
    fulfillments.map((fulfillment) => [
      fulfillment.data.shipment_number,
      fulfillment,
    ]),
  )
  const shipmentNumbers = [...fulfillmentMap.keys()]
  const batches: string[][] = []

  for (let index = 0; index < shipmentNumbers.length; index += BATCH_SIZE) {
    batches.push(shipmentNumbers.slice(index, index + BATCH_SIZE))
  }

  await Promise.all(
    batches.map(async (batch) => {
      await processBatch(ctx, pplClient, batch, fulfillmentMap)
    }),
  )
}

/**
 * PPL Tracking Sync Job
 *
 * Runs every 15 minutes to sync tracking status for PPL fulfillments.
 */
const pplTrackingSyncJob = async (container: MedusaContainer) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env["FEATURE_PPL_ENABLED"] !== "1") {
    logger.debug(
      "PPL Tracking Sync: PPL module is disabled (FEATURE_PPL_ENABLED != 1), skipping",
    )
    return
  }

  const pplClient = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)
  const config = await pplClient.getConfig()
  if (config?.is_enabled !== true) {
    logger.debug(
      "PPL Tracking Sync: PPL is disabled in settings (is_enabled = false), skipping",
    )
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT,
  )
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("PPL Tracking Sync: Starting...")

  try {
    const pendingFulfillments = await fetchPendingFulfillments(query)
    if (pendingFulfillments.length === 0) {
      logger.info("PPL Tracking Sync: No pending fulfillments to check")
      return
    }

    logger.info(
      `PPL Tracking Sync: Found ${pendingFulfillments.length} pending fulfillments`,
    )
    await processFulfillmentsInBatches(
      { eventBus, fulfillmentService, logger },
      pplClient,
      pendingFulfillments,
    )
    logger.info("PPL Tracking Sync: Completed")
  } catch (error) {
    logger.error(
      "PPL Tracking Sync failed",
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}

export const config = {
  name: "ppl-tracking-sync",
  schedule: "*/15 * * * *",
}

export default pplTrackingSyncJob
