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
} from "../modules/gls-client"
import type {
  GLSClientModuleService,
  GLSFulfillmentData,
  GLSPacketStatusRecord,
  GLSShipmentState,
} from "../modules/gls-client"

interface FulfillmentRecord {
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

interface GLSPendingEvent {
  key: string
  name: "gls.delivered" | "gls.delivery_failed"
  data: Record<string, unknown>
}

interface TrackingContext {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

const LOCK_KEY = "gls-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120
const CHUNK_SIZE = 25
const PENDING_FETCH_MULTIPLIER = 4
const GLS_DELIVERED_EVENT_NAME: GLSPendingEvent["name"] = "gls.delivered"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const hasValidIdentity = (value: Record<string, unknown>): boolean => {
  const id: unknown = value["id"]
  const providerId: unknown = value["provider_id"]
  const shippedAt: unknown = value["shipped_at"]
  const deliveredAt: unknown = value["delivered_at"]

  return (
    typeof id === "string" &&
    providerId === GLS_PROVIDER_ID &&
    typeof shippedAt === "string" &&
    deliveredAt === null
  )
}

const hasValidPacketId = (data: Record<string, unknown>): boolean => {
  const packetId: unknown = data["packet_id"]
  return typeof packetId === "number" || typeof packetId === "string"
}

const hasValidParcelNumber = (data: Record<string, unknown>): boolean => {
  const parcelNumber: unknown = data["parcel_number"]
  return (
    parcelNumber === undefined ||
    typeof parcelNumber === "string" ||
    typeof parcelNumber === "number"
  )
}

const hasValidPacketFields = (data: Record<string, unknown>): boolean => {
  const barcode: unknown = data["barcode"]
  const accessPointId: unknown = data["access_point_id"]
  const supportsCod: unknown = data["supports_cod"]
  const deliveryFailed: unknown = data["delivery_failed"]

  return (
    typeof barcode === "string" &&
    typeof accessPointId === "string" &&
    typeof supportsCod === "boolean" &&
    deliveryFailed !== true
  )
}

const isPendingFulfillment = (value: unknown): value is PendingFulfillment => {
  if (!(isRecord(value) && isRecord(value["data"]))) {
    return false
  }

  const { data } = value

  return (
    hasValidIdentity(value) &&
    hasValidPacketId(data) &&
    hasValidParcelNumber(data) &&
    hasValidPacketFields(data)
  )
}

const fetchPendingFulfillments = async (
  query: Query,
  limit: number,
): Promise<PendingFulfillment[]> => {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
    filters: {
      delivered_at: null,
      provider_id: GLS_PROVIDER_ID,
      shipped_at: { $ne: null },
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

const getPendingDeliveredAt = (
  pendingEvent: GLSPendingEvent,
): Date | undefined => {
  if (pendingEvent.name !== GLS_DELIVERED_EVENT_NAME) {
    return undefined
  }

  const deliveredAt: unknown = pendingEvent.data["delivered_at"]
  if (typeof deliveredAt !== "string") {
    return undefined
  }

  const date = new Date(deliveredAt)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const buildPendingEvent = (
  name: GLSPendingEvent["name"],
  fulfillment: PendingFulfillment,
  data: Record<string, unknown>,
): GLSPendingEvent => {
  const status: unknown = data["status"]
  const statusFragment =
    typeof status === "string" || typeof status === "number"
      ? String(status)
      : ""

  return {
    data: {
      barcode: fulfillment.data.barcode,
      fulfillment_id: fulfillment.id,
      packet_id: fulfillment.data.packet_id,
      ...data,
    },
    key: `${name}:${fulfillment.id}:${fulfillment.data.packet_id}:${statusFragment}`,
    name,
  }
}

const getPendingEvent = (value: unknown): GLSPendingEvent | null => {
  if (!(isRecord(value) && isRecord(value["data"]))) {
    return null
  }

  const { key, name } = value

  if (
    typeof key !== "string" ||
    (name !== GLS_DELIVERED_EVENT_NAME && name !== "gls.delivery_failed")
  ) {
    return null
  }

  return { data: value["data"], key, name }
}

const emitPendingEvent = async (
  ctx: TrackingContext,
  pendingEvent: GLSPendingEvent,
): Promise<void> => {
  await ctx.eventBus.emit({
    data: {
      ...pendingEvent.data,
      idempotency_key: pendingEvent.key,
    },
    name: pendingEvent.name,
  })
}

const flushPendingEvent = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
): Promise<boolean> => {
  const pendingEvent = getPendingEvent(fulfillment.data["gls_pending_event"])
  if (!pendingEvent) {
    return false
  }

  await emitPendingEvent(ctx, pendingEvent)
  const updatedData = (({ gls_pending_event: _pendingEvent, ...rest }) => rest)(
    fulfillment.data,
  )
  const deliveredAt = getPendingDeliveredAt(pendingEvent)
  await ctx.fulfillmentService.updateFulfillment(fulfillment.id, {
    ...(deliveredAt ? { delivered_at: deliveredAt } : {}),
    data: updatedData,
  })
  return true
}

const handleDelivered = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const { data } = fulfillment
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `GLS: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`,
  )

  const pendingEvent = buildPendingEvent(
    GLS_DELIVERED_EVENT_NAME,
    fulfillment,
    {
      delivered_at: deliveredAt.toISOString(),
      status: newStatus,
    },
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      gls_pending_event: pendingEvent,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })

  await emitPendingEvent(ctx, pendingEvent)

  const updatedData = (({ gls_pending_event: _pendingEvent, ...rest }) => rest)(
    data,
  )
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...updatedData,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
    delivered_at: deliveredAt,
  })
}

const handleFailed = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const { data } = fulfillment

  logger.warn(`GLS: Packet ${data.packet_id} failed (${newStatus})`)

  const pendingEvent = buildPendingEvent("gls.delivery_failed", fulfillment, {
    status: newStatus,
    status_date: latest.dateTime,
  })

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      delivery_failed: true,
      gls_pending_event: pendingEvent,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })

  await emitPendingEvent(ctx, pendingEvent)

  const updatedData = (({ gls_pending_event: _pendingEvent, ...rest }) => rest)(
    data,
  )
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...updatedData,
      delivery_failed: true,
      last_status: newStatus,
      last_status_date: latest.dateTime,
    },
  })
}

const handleInTransit = async (
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  latest: GLSPacketStatusRecord,
  newStatus: GLSShipmentState,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const { data } = fulfillment

  logger.debug(`GLS: Packet ${data.packet_id} status: ${newStatus}`)

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
  glsClient: GLSClientModuleService,
  fulfillment: PendingFulfillment,
): Promise<void> => {
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
      `GLS Tracking Sync: Failed to fetch status for packet ${packetId} / parcel ${parcelNumber}: ${error instanceof Error ? error.message : String(error)}`,
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
    `GLS: Packet ${packetId} (barcode ${fulfillment.data.barcode}) status changed: ${currentStatus ?? "unknown"} -> ${newStatus}`,
  )

  if (GLS_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, latest, newStatus)
  } else if (GLS_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, latest, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, latest, newStatus)
  }
}

// Pending fulfillments are processed one at a time (not Promise.all) because
// GLS's packetStatus endpoint is per-packet and serial execution keeps us
// well within the API's rate budget. Bounded tail recursion replaces a
// for-of/await loop so each item still runs strictly after the previous one.
const processPendingFulfillments = async (
  ctx: TrackingContext,
  glsClient: GLSClientModuleService,
  pending: PendingFulfillment[],
  index: number,
): Promise<void> => {
  const fulfillment = pending[index]
  if (!fulfillment) {
    return
  }

  try {
    await processFulfillment(ctx, glsClient, fulfillment)
  } catch (error) {
    ctx.logger.error(
      `GLS Tracking Sync: Failed to process fulfillment ${fulfillment.id}`,
      error instanceof Error ? error : new Error(String(error)),
    )
  }

  await processPendingFulfillments(ctx, glsClient, pending, index + 1)
}

const run = async (container: MedusaContainer, logger: Logger) => {
  const glsClient = container.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

  const runtimeConfig = await glsClient.getConfig()
  if (runtimeConfig === null || !runtimeConfig.is_enabled) {
    logger.debug("GLS Tracking Sync: disabled in settings, skipping")
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT,
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
      `GLS Tracking Sync: Processing ${pending.length} pending fulfillments (limit ${CHUNK_SIZE})`,
    )

    const ctx: TrackingContext = { eventBus, fulfillmentService, logger }
    await processPendingFulfillments(ctx, glsClient, pending, 0)

    logger.info("GLS Tracking Sync: Completed")
  } catch (error) {
    logger.error(
      "GLS Tracking Sync failed",
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}

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

  if (process.env["FEATURE_GLS_ENABLED"] !== "1") {
    logger.debug(
      "GLS Tracking Sync: module disabled (FEATURE_GLS_ENABLED != 1), skipping",
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
      { timeout: LOCK_TIMEOUT_SECONDS },
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
