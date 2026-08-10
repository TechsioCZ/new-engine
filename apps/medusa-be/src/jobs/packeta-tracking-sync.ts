import type { MedusaContainer } from "@medusajs/framework"
import type {
  IEventBusModuleService,
  IFulfillmentModuleService,
  ILockingModule,
  Logger,
  Query,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import {
  PACKETA_CLIENT_MODULE,
  PACKETA_DELIVERED_STATES,
  PACKETA_FAILED_STATES,
} from "../modules/packeta-client"
import type {
  PacketaClientModuleService,
  PacketaPacketStatusRecord,
  PacketaShipmentState,
} from "../modules/packeta-client"
import { executeWithLockTimeout } from "../utils/locking"

interface TrackingContext {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const LOCK_KEY = "packeta-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120
const MAX_PENDING_FULFILLMENTS_PER_RUN = 100

const packetaShipmentStateSchema = z.enum([
  "received_data",
  "arrived",
  "prepared_for_departure",
  "departed",
  "ready_for_pickup",
  "handed_to_carrier",
  "delivered",
  "posted_back",
  "returned",
  "cancelled",
  "customs_declaration",
  "collected",
  "unknown",
])

const pendingFulfillmentSchema = z.object({
  data: z
    .object({
      access_point_id: z.number(),
      barcode: z.string(),
      last_status: packetaShipmentStateSchema.optional(),
      packet_id: z.number(),
      status: z.enum(["completed", "error"]),
      supports_cod: z.boolean(),
    })
    .loose(),
  delivered_at: z.string().nullable(),
  id: z.string(),
  provider_id: z.string(),
  shipped_at: z.string().nullable(),
})

type PendingFulfillment = z.infer<typeof pendingFulfillmentSchema>

const handleDelivered = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService, eventBus } = ctx
  const { data } = fulfillment
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `Packeta: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`,
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
    delivered_at: deliveredAt,
  })

  await eventBus.emit({
    data: {
      barcode: data.barcode,
      delivered_at: deliveredAt.toISOString(),
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      status: newStatus,
    },
    name: "packeta.delivered",
  })
}

const handleFailed = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService, eventBus } = ctx
  const { data } = fulfillment

  logger.warn(`Packeta: Packet ${data.packet_id} failed (${newStatus})`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      delivery_failed: true,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })

  await eventBus.emit({
    data: {
      barcode: data.barcode,
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      status: newStatus,
      status_date: latest.dateTime,
    },
    name: "packeta.delivery_failed",
  })
}

const handleInTransit = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const { data } = fulfillment

  logger.debug(`Packeta: Packet ${data.packet_id} status: ${newStatus}`)

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })
}

const processFulfillment = async (
  ctx: TrackingContext,
  packetaClient: PacketaClientModuleService,
  fulfillment: PendingFulfillment,
): Promise<void> => {
  const { logger } = ctx
  const { packet_id: packetId } = fulfillment.data

  let history: PacketaPacketStatusRecord[]
  try {
    history = await packetaClient.getPacketStatus(packetId)
  } catch (error) {
    logger.warn(
      `Packeta Tracking Sync: Failed to fetch status for packet ${packetId}: ${error instanceof Error ? error.message : String(error)}`,
    )
    return
  }

  // Packeta returns status records in chronological order — take the latest.
  const latest = history.at(-1)
  if (latest === undefined) {
    return
  }
  const currentStatus = fulfillment.data.last_status
  const newStatus = latest.state

  if (currentStatus === newStatus) {
    return
  }

  logger.info(
    `Packeta: Packet ${packetId} (barcode ${fulfillment.data.barcode}) status changed: ${currentStatus ?? "unknown"} -> ${newStatus}`,
  )

  if (PACKETA_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, latest, newStatus)
  } else if (PACKETA_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, latest, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, latest, newStatus)
  }
}

const fetchPendingFulfillments = async (
  query: Query,
): Promise<PendingFulfillment[]> => {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
    filters: {
      delivered_at: null,
      provider_id: "packeta_packeta",
      shipped_at: { $ne: null },
    },
    pagination: {
      order: {
        shipped_at: "ASC",
      },
      skip: 0,
      take: MAX_PENDING_FULFILLMENTS_PER_RUN,
    },
  })

  const untrustedFulfillments = z.array(z.unknown()).safeParse(fulfillments)
  if (!untrustedFulfillments.success) {
    return []
  }

  return untrustedFulfillments.data.flatMap((fulfillment) => {
    const parsedFulfillment = pendingFulfillmentSchema.safeParse(fulfillment)
    return parsedFulfillment.success ? [parsedFulfillment.data] : []
  })
}

// Packeta's packetStatus endpoint is per-packet. This bounded recursion keeps
// API calls strictly serial while avoiding an await-in-loop implementation.
const processPendingFulfillments = async (
  ctx: TrackingContext,
  packetaClient: PacketaClientModuleService,
  pending: PendingFulfillment[],
  index: number,
): Promise<void> => {
  const fulfillment = pending[index]
  if (fulfillment === undefined) {
    return
  }

  await processFulfillment(ctx, packetaClient, fulfillment)
  await processPendingFulfillments(ctx, packetaClient, pending, index + 1)
}

const run = async (
  container: MedusaContainer,
  logger: Logger,
): Promise<void> => {
  const packetaClient = container.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE,
  )

  const runtimeConfig = await packetaClient.getConfig()
  if (runtimeConfig?.is_enabled !== true) {
    logger.debug("Packeta Tracking Sync: disabled in settings, skipping")
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT,
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
      `Packeta Tracking Sync: Found ${pending.length} pending fulfillments`,
    )

    const ctx: TrackingContext = { eventBus, fulfillmentService, logger }
    await processPendingFulfillments(ctx, packetaClient, pending, 0)

    logger.info("Packeta Tracking Sync: Completed")
  } catch (error) {
    const jobError = error instanceof Error ? error : new Error(String(error))
    logger.error("Packeta Tracking Sync failed", jobError)
    throw jobError
  }
}

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
const packetaTrackingSyncJob = async (
  container: MedusaContainer,
): Promise<void> => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  if (process.env["FEATURE_PACKETA_ENABLED"] !== "1") {
    logger.debug(
      "Packeta Tracking Sync: module disabled (FEATURE_PACKETA_ENABLED != 1), skipping",
    )
    return
  }

  const lockingService = container.resolve<ILockingModule>(Modules.LOCKING)

  const result = await executeWithLockTimeout(
    lockingService,
    LOCK_KEY,
    LOCK_TIMEOUT_SECONDS,
    async () => {
      await run(container, logger)
    },
  )

  if (result.status === "timed_out") {
    logger.debug(
      "Packeta Tracking Sync: lock held by another instance, skipping",
    )
  }
}

export const config = {
  name: "packeta-tracking-sync",
  schedule: "*/15 * * * *",
}

export default packetaTrackingSyncJob
