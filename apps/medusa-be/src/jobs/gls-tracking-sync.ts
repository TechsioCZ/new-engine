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
  GLS_PROVIDER_ID,
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
  data: GLSFulfillmentData & {
    packet_id: string | number
    barcode: string
    parcel_number?: string | number
  }
}

type GLSPendingEvent = {
  key: string
  name: "gls.delivered" | "gls.delivery_failed"
  data: Record<string, unknown>
}

type TrackingContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const LOCK_KEY = "gls-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120
const CHUNK_SIZE = 25
const PENDING_FETCH_MULTIPLIER = 4

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
    const pending = await fetchPendingFulfillments(query, CHUNK_SIZE)

    if (pending.length === 0) {
      logger.info("GLS Tracking Sync: No pending fulfillments to check")
      return
    }

    logger.info(
      `GLS Tracking Sync: Processing ${pending.length} pending fulfillments (limit ${CHUNK_SIZE})`
    )

    const ctx: TrackingContext = { logger, fulfillmentService, eventBus }
    for (const fulfillment of pending) {
      try {
        await processFulfillment(ctx, glsClient, fulfillment)
      } catch (error) {
        logger.error(
          `GLS Tracking Sync: Failed to process fulfillment ${fulfillment.id}`,
          error instanceof Error ? error : new Error(String(error))
        )
      }
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
  query: Query,
  limit: number
): Promise<PendingFulfillment[]> {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
    filters: {
      provider_id: GLS_PROVIDER_ID,
      shipped_at: { $ne: null },
      delivered_at: null,
    },
    pagination: {
      order: {
        shipped_at: "ASC",
      },
      skip: 0,
      take: limit * PENDING_FETCH_MULTIPLIER,
    },
  })

  // JSON field filtering (data.delivery_failed) must be done in-memory.
  const rawFulfillments: unknown = fulfillments
  return Array.isArray(rawFulfillments)
    ? rawFulfillments.filter(isPendingFulfillment).slice(0, limit)
    : []
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPendingFulfillment(value: unknown): value is PendingFulfillment {
  if (!(isRecord(value) && isRecord(value.data))) {
    return false
  }

  const id: unknown = value.id
  const providerId: unknown = value.provider_id
  const shippedAt: unknown = value.shipped_at
  const deliveredAt: unknown = value.delivered_at
  const packetId: unknown = value.data.packet_id
  const barcode: unknown = value.data.barcode
  const parcelNumber: unknown = value.data.parcel_number
  const accessPointId: unknown = value.data.access_point_id
  const supportsCod: unknown = value.data.supports_cod
  const deliveryFailed: unknown = value.data.delivery_failed

  return (
    typeof id === "string" &&
    providerId === GLS_PROVIDER_ID &&
    typeof shippedAt === "string" &&
    deliveredAt === null &&
    deliveryFailed !== true &&
    (typeof packetId === "number" || typeof packetId === "string") &&
    typeof barcode === "string" &&
    (parcelNumber === undefined ||
      typeof parcelNumber === "string" ||
      typeof parcelNumber === "number") &&
    typeof accessPointId === "string" &&
    typeof supportsCod === "boolean"
  )
}

async function processFulfillment(
  ctx: TrackingContext,
  glsClient: GLSClientModuleService,
  fulfillment: PendingFulfillment
): Promise<void> {
  const { logger } = ctx
  const {
    packet_id: packetId,
    barcode,
    parcel_number: parcelNumber = barcode,
  } = fulfillment.data

  if (await flushPendingEvent(ctx, fulfillment)) {
    return
  }

  let history: GLSPacketStatusRecord[]
  try {
    history = await glsClient.getPacketStatus(parcelNumber)
  } catch (error) {
    logger.warn(
      `GLS Tracking Sync: Failed to fetch status for packet ${packetId} / parcel ${parcelNumber}: ${error instanceof Error ? error.message : String(error)}`
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
    `GLS: Packet ${packetId} (barcode ${fulfillment.data.barcode}) status changed: ${currentStatus ?? "unknown"} -> ${newStatus}`
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
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `GLS: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`
  )

  const pendingEvent = buildPendingEvent("gls.delivered", fulfillment, {
    delivered_at: deliveredAt.toISOString(),
    status: newStatus,
  })

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      gls_pending_event: pendingEvent,
    },
  })

  await emitPendingEvent(ctx, pendingEvent)

  const { gls_pending_event: _pendingEvent, ...updatedData } = data
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    delivered_at: deliveredAt,
    data: {
      ...updatedData,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })
}

async function handleFailed(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data

  logger.warn(`GLS: Packet ${data.packet_id} failed (${newStatus})`)

  const pendingEvent = buildPendingEvent("gls.delivery_failed", fulfillment, {
    status: newStatus,
    status_date: latest.dateTime,
  })

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      delivery_failed: true,
      gls_pending_event: pendingEvent,
    },
  })

  await emitPendingEvent(ctx, pendingEvent)

  const { gls_pending_event: _pendingEvent, ...updatedData } = data
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...updatedData,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      delivery_failed: true,
    },
  })
}

async function flushPendingEvent(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment
): Promise<boolean> {
  const pendingEvent = getPendingEvent(fulfillment.data.gls_pending_event)
  if (!pendingEvent) {
    return false
  }

  await emitPendingEvent(ctx, pendingEvent)
  const { gls_pending_event: _pendingEvent, ...updatedData } = fulfillment.data
  const deliveredAt = getPendingDeliveredAt(pendingEvent)
  await ctx.fulfillmentService.updateFulfillment(fulfillment.id, {
    ...(deliveredAt ? { delivered_at: deliveredAt } : {}),
    data: updatedData,
  })
  return true
}

function getPendingDeliveredAt(
  pendingEvent: GLSPendingEvent
): Date | undefined {
  if (pendingEvent.name !== "gls.delivered") {
    return
  }

  const deliveredAt: unknown = pendingEvent.data.delivered_at
  if (typeof deliveredAt !== "string") {
    return
  }

  const date = new Date(deliveredAt)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function buildPendingEvent(
  name: GLSPendingEvent["name"],
  fulfillment: PendingFulfillment,
  data: Record<string, unknown>
): GLSPendingEvent {
  return {
    key: `${name}:${fulfillment.id}:${fulfillment.data.packet_id}:${String(data.status ?? "")}`,
    name,
    data: {
      fulfillment_id: fulfillment.id,
      packet_id: fulfillment.data.packet_id,
      barcode: fulfillment.data.barcode,
      ...data,
    },
  }
}

function getPendingEvent(value: unknown): GLSPendingEvent | null {
  if (!(isRecord(value) && isRecord(value.data))) {
    return null
  }

  const key: unknown = value.key
  const name: unknown = value.name

  if (
    typeof key !== "string" ||
    (name !== "gls.delivered" && name !== "gls.delivery_failed")
  ) {
    return null
  }

  return { key, name, data: value.data }
}

async function emitPendingEvent(
  ctx: TrackingContext,
  pendingEvent: GLSPendingEvent
): Promise<void> {
  await ctx.eventBus.emit({
    name: pendingEvent.name,
    data: {
      ...pendingEvent.data,
      idempotency_key: pendingEvent.key,
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
