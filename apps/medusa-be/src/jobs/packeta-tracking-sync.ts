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
  PACKETA_CLIENT_MODULE,
  PACKETA_DELIVERED_STATES,
  PACKETA_FAILED_STATES,
  type PacketaClientModuleService,
  type PacketaFulfillmentData,
  type PacketaPacketStatusRecord,
  type PacketaShipmentState,
} from "../modules/packeta-client"

type FulfillmentRecord = {
  id: string
  data: PacketaFulfillmentData | null
  shipped_at: string | null
  delivered_at: string | null
  provider_id: string
}

interface PendingFulfillment extends FulfillmentRecord {
  data: PacketaFulfillmentData & { packet_id: number }
}

type TrackingContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const LOCK_KEY = "packeta-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120

/**
 * Packeta Tracking Sync Job
 *
 * Runs every 15 minutes to poll packet status for each shipped-but-not-delivered
 * Packeta fulfillment, and emit domain events on status changes.
 *
 * Unlike PPL (which supports batch queries), Packeta's packetStatus endpoint is
 * per-packet — so we make one request per pending fulfillment. Serial execution
 * keeps us well within the API's rate budget; batching can be added later if
 * the pending-fulfillment volume grows.
 */
export default async function packetaTrackingSyncJob(
  container: MedusaContainer
) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env.FEATURE_PACKETA_ENABLED !== "1") {
    logger.debug(
      "Packeta Tracking Sync: module disabled (FEATURE_PACKETA_ENABLED != 1), skipping"
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
      logger.debug(
        "Packeta Tracking Sync: lock held by another instance, skipping"
      )
      return
    }
    throw error
  }
}

export const config = {
  name: "packeta-tracking-sync",
  schedule: "*/15 * * * *",
}

async function run(container: MedusaContainer, logger: Logger) {
  const packetaClient = container.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const runtimeConfig = await packetaClient.getConfig()
  if (!runtimeConfig?.is_enabled) {
    logger.debug("Packeta Tracking Sync: disabled in settings, skipping")
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("Packeta Tracking Sync: Starting...")

  try {
    const pending = await fetchPendingFulfillments(query)

    if (pending.length === 0) {
      logger.info("Packeta Tracking Sync: No pending fulfillments to check")
      return
    }

    logger.info(
      `Packeta Tracking Sync: Found ${pending.length} pending fulfillments`
    )

    const ctx: TrackingContext = { logger, fulfillmentService, eventBus }
    for (const fulfillment of pending) {
      await processFulfillment(ctx, packetaClient, fulfillment)
    }

    logger.info("Packeta Tracking Sync: Completed")
  } catch (error) {
    logger.error(
      "Packeta Tracking Sync failed",
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
      provider_id: "packeta_packeta",
    },
  })

  return (fulfillments as FulfillmentRecord[]).filter(
    (f): f is PendingFulfillment =>
      f.shipped_at !== null &&
      !f.delivered_at &&
      typeof f.data?.packet_id === "number"
  )
}

async function processFulfillment(
  ctx: TrackingContext,
  packetaClient: PacketaClientModuleService,
  fulfillment: PendingFulfillment
): Promise<void> {
  const { logger } = ctx
  const { packet_id: packetId } = fulfillment.data

  let history: PacketaPacketStatusRecord[]
  try {
    history = await packetaClient.getPacketStatus(packetId)
  } catch (error) {
    logger.warn(
      `Packeta Tracking Sync: Failed to fetch status for packet ${packetId}: ${error instanceof Error ? error.message : String(error)}`
    )
    return
  }

  // Packeta returns status records in chronological order — take the latest.
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
    `Packeta: Packet ${packetId} (barcode ${fulfillment.data.barcode}) status changed: ${currentStatus || "unknown"} -> ${newStatus}`
  )

  if (PACKETA_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, latest, newStatus)
  } else if (PACKETA_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, latest, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, latest, newStatus)
  }
}

async function handleDelivered(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState
): Promise<void> {
  const { logger, fulfillmentService, eventBus } = ctx
  const data = fulfillment.data
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `Packeta: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`
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
    name: "fulfillment.delivered",
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
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState
): Promise<void> {
  const { logger, fulfillmentService, eventBus } = ctx
  const data = fulfillment.data

  logger.warn(`Packeta: Packet ${data.packet_id} failed (${newStatus})`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      delivery_failed: true,
    },
  })

  await eventBus.emit({
    name: "fulfillment.delivery_failed",
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
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data

  logger.debug(`Packeta: Packet ${data.packet_id} status: ${newStatus}`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })
}
