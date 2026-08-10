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
import { getRecordValue, omitUndefined } from "@techsio/std/object"

import {
  GLS_CLIENT_MODULE,
  GLS_DELIVERED_STATES,
  GLS_FAILED_STATES,
  GLS_PROVIDER_ID,
} from "../modules/gls-client"
import type {
  GLSClientModuleService,
  GLSPacketStatusRecord,
  GLSShipmentState,
} from "../modules/gls-client"
import { executeWithLockTimeout } from "../utils/locking"

interface GLSPendingEventData {
  barcode: string
  delivered_at?: string
  fulfillment_id: string
  packet_id: string | number
  status: GLSShipmentState
  status_date?: string
}

interface GLSPendingEvent {
  key: string
  name: "gls.delivered" | "gls.delivery_failed"
  data: GLSPendingEventData
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

const glsShipmentStateSchema = z.enum([
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
  // Retain package-owned extensions such as gls_pending_event for write-back.
  data: z
    .object({
      access_point_id: z.string(),
      barcode: z.string(),
      // Older JSON rows persisted a nullable marker before it became optional.
      delivery_failed: z.union([z.literal(false), z.null()]).optional(),
      label_url: z.string().optional(),
      last_status: glsShipmentStateSchema.optional(),
      packet_id: z.union([z.string(), z.number()]),
      parcel_number: z.union([z.string(), z.number()]).optional(),
      // Fulfillments created before the provider status field remain trackable.
      status: z.enum(["completed", "error"]).optional(),
      supports_cod: z.boolean(),
    })
    .loose(),
  delivered_at: z.null(),
  id: z.string(),
  provider_id: z.literal(GLS_PROVIDER_ID),
  shipped_at: z.string(),
})

type PendingFulfillment = z.infer<typeof pendingFulfillmentSchema>

const pendingFulfillmentCandidateSchema = z.union([
  pendingFulfillmentSchema,
  z.unknown().transform(() => null),
])

const pendingFulfillmentsSchema = z
  .array(pendingFulfillmentCandidateSchema)
  .transform((fulfillments) =>
    fulfillments.flatMap((fulfillment) =>
      fulfillment === null ? [] : [fulfillment],
    ),
  )

export const decodePendingFulfillments = (
  value: unknown,
  limit: number,
): PendingFulfillment[] => {
  const result = pendingFulfillmentsSchema.safeParse(value)
  return result.success ? result.data.slice(0, limit) : []
}

const pendingEventSchema = z.object({
  data: z.object({
    barcode: z.string(),
    delivered_at: z.string().optional(),
    fulfillment_id: z.string(),
    packet_id: z.union([z.string(), z.number()]),
    status: glsShipmentStateSchema,
    status_date: z.string().optional(),
  }),
  key: z.string(),
  name: z.enum([GLS_DELIVERED_EVENT_NAME, "gls.delivery_failed"]),
})

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
  return decodePendingFulfillments(fulfillments, limit)
}

const getPendingDeliveredAt = (
  pendingEvent: GLSPendingEvent,
): Date | undefined => {
  if (pendingEvent.name !== GLS_DELIVERED_EVENT_NAME) {
    return undefined
  }

  const deliveredAt = pendingEvent.data.delivered_at
  if (typeof deliveredAt !== "string") {
    return undefined
  }

  const date = new Date(deliveredAt)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const buildPendingEvent = (
  name: GLSPendingEvent["name"],
  fulfillment: PendingFulfillment,
  data: Pick<GLSPendingEventData, "status" | "delivered_at" | "status_date">,
): GLSPendingEvent => {
  const statusFragment = data.status

  return {
    data: omitUndefined({
      barcode: fulfillment.data.barcode,
      delivered_at: data.delivered_at,
      fulfillment_id: fulfillment.id,
      packet_id: fulfillment.data.packet_id,
      status: data.status,
      status_date: data.status_date,
    }),
    key: `${name}:${fulfillment.id}:${fulfillment.data.packet_id}:${statusFragment}`,
    name,
  }
}

const getPendingEvent = (value: unknown): GLSPendingEvent | null => {
  const result = pendingEventSchema.safeParse(value)
  if (!result.success) {
    return null
  }
  return {
    data: omitUndefined(result.data.data),
    key: result.data.key,
    name: result.data.name,
  }
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
  const pendingEvent = getPendingEvent(
    getRecordValue(fulfillment.data, "gls_pending_event"),
  )
  if (!pendingEvent) {
    return false
  }

  await emitPendingEvent(ctx, pendingEvent)
  const updatedData = { ...fulfillment.data }
  Reflect.deleteProperty(updatedData, "gls_pending_event")
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

  const updatedData = { ...data }
  Reflect.deleteProperty(updatedData, "gls_pending_event")
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

  const updatedData = { ...data }
  Reflect.deleteProperty(updatedData, "gls_pending_event")
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

  const result = await executeWithLockTimeout(
    lockingService,
    LOCK_KEY,
    LOCK_TIMEOUT_SECONDS,
    async () => {
      await run(container, logger)
    },
  )

  if (result.status === "timed_out") {
    logger.debug("GLS Tracking Sync: lock held by another instance, skipping")
  }
}

export const config = {
  name: "gls-tracking-sync",
  schedule: "*/15 * * * *",
}
