import type { MedusaContainer } from "@medusajs/framework"
import type {
  IEventBusModuleService,
  IFulfillmentModuleService,
  ILockingModule,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  GLS_CLIENT_MODULE,
  GLS_DELIVERED_STATES,
  GLS_FAILED_STATES,
  type GLSClientModuleService,
  type GLSFulfillmentData,
  type GLSPacketStatusRecord,
  type GLSShipmentState,
} from "../modules/gls-client"

type FulfillmentRecord = {
  id: string
  data: GLSFulfillmentData | null
  shipped_at: string | null
  delivered_at: string | null
  provider_id: string
}

interface PendingFulfillment extends FulfillmentRecord {
  data: GLSFulfillmentData & { packet_id: string | number }
}

type TrackingContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const LOCK_KEY = "gls-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120

/**
 * GLS Tracking Sync Job
 *
 * Runs every 15 minutes to poll packet status for each shipped-but-not-delivered
 * GLS fulfillment, and emit domain events on status changes.
 *
 * Unlike PPL (which supports batch queries), GLS's packetStatus endpoint is
 * per-packet — so we make one request per pending fulfillment. Serial execution
 * keeps us well within the API's rate budget; batching can be added later if
 * the pending-fulfillment volume grows.
 */
export default async function glsTrackingSyncJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env.FEATURE_GLS_ENABLED !== "1") {
    logger.debug(
      "GLS Tracking Sync: module disabled (FEATURE_GLS_ENABLED != 1), skipping"
    )
    return
  }

  const lockingService = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    await lockingService.execute(
      LOCK_KEY,
      async () => {
        await run(container, logger)
      },
      { timeout: LOCK_TIMEOUT_SECONDS }
    )
  } catch (error) {
    if (error instanceof Error && error.message.includes("Timed-out")) {
      logger.debug("GLS Tracking Sync: lock held by another instance, skipping")
      return
    }
    throw error
  }
}

export const config = {
  name: "gls-tracking-sync",
  schedule: "*/15 * * * *",
}

async function run(container: MedusaContainer, logger: Logger) {
  const glsClient = container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

  const runtimeConfig = await glsClient.getConfig()
  if (!runtimeConfig?.is_enabled) {
    logger.debug("GLS Tracking Sync: disabled in settings, skipping")
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("GLS Tracking Sync: Starting...")

  try {
    const pending = await fetchPendingFulfillments(query)

    if (pending.length === 0) {
      logger.info("GLS Tracking Sync: No pending fulfillments to check")
      return
    }

    logger.info(
      `GLS Tracking Sync: Found ${pending.length} pending fulfillments`
    )

    const ctx: TrackingContext = { logger, fulfillmentService, eventBus }
    for (const fulfillment of pending) {
      await processFulfillment(ctx, glsClient, fulfillment)
    }

    logger.info("GLS Tracking Sync: Completed")
  } catch (error) {
    logger.error(
      "GLS Tracking Sync failed",
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

async function fetchPendingFulfillments(
  query: Query
): Promise<PendingFulfillment[]> {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
    filters: {
      provider_id: "gls_gls",
      shipped_at: { $ne: null },
      delivered_at: null,
    },
  })

  return (fulfillments as FulfillmentRecord[]).filter(
    (f): f is PendingFulfillment =>
      typeof f.data?.packet_id === "number" ||
      typeof f.data?.packet_id === "string"
  )
}

async function processFulfillment(
  ctx: TrackingContext,
  glsClient: GLSClientModuleService,
  fulfillment: PendingFulfillment
): Promise<void> {
  const { logger } = ctx
  const { packet_id: packetId } = fulfillment.data

  let history: GLSPacketStatusRecord[]
  try {
    history = await glsClient.getPacketStatus(packetId)
  } catch (error) {
    logger.warn(
      `GLS Tracking Sync: Failed to fetch status for packet ${packetId}: ${error instanceof Error ? error.message : String(error)}`
    )
    return
  }

  // GLS returns status records in chronological order — take the latest.
  const latest = history.at(-1)
  if (!latest) {
    return
  }
  const currentStatus = fulfillment.data.last_status
  const newStatus = latest.state

  if (currentStatus === newStatus) {
    return
  }

  logger.info(
    `GLS: Packet ${packetId} (barcode ${fulfillment.data.barcode}) status changed: ${currentStatus || "unknown"} -> ${newStatus}`
  )

  if (GLS_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, latest, newStatus)
  } else if (GLS_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, latest, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, latest, newStatus)
  }
}

async function handleDelivered(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState
): Promise<void> {
  const { logger, fulfillmentService, eventBus } = ctx
  const data = fulfillment.data
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `GLS: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    delivered_at: deliveredAt,
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })

  await eventBus.emit({
    name: "gls.delivered",
    data: {
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      barcode: data.barcode,
      delivered_at: deliveredAt.toISOString(),
      status: newStatus,
    },
  })
}

async function handleFailed(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState
): Promise<void> {
  const { logger, fulfillmentService, eventBus } = ctx
  const data = fulfillment.data

  logger.warn(`GLS: Packet ${data.packet_id} failed (${newStatus})`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      delivery_failed: true,
    },
  })

  await eventBus.emit({
    name: "gls.delivery_failed",
    data: {
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      barcode: data.barcode,
      status: newStatus,
      status_date: latest.dateTime,
    },
  })
}

async function handleInTransit(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data

  logger.debug(`GLS: Packet ${data.packet_id} status: ${newStatus}`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })
}
