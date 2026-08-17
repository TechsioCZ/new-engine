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
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  PACKETA_CLIENT_MODULE,
  PACKETA_DELIVERED_STATES,
  PACKETA_FAILED_STATES,
  type PacketaClientModuleService,
  type PacketaFulfillmentData,
  type PacketaPacketStatusRecord,
  type PacketaShipmentState,
} from "../modules/packeta-client"
import {
  createCarrierSyncEvent,
  emitCarrierSyncEvent,
  getCarrierSyncEvent,
} from "../utils/carrier-sync-event"

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
const FETCH_PAGE_SIZE = 100
const PROCESS_LIMIT = 100
const PACKETA_TRACKING_EVENTS = [
  "packeta.delivered",
  "packeta.delivery_failed",
] as const

const synchronizePacketaTrackingStep = createStep(
  "synchronize-packeta-tracking",
  async (_input: Record<string, never>, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    if (process.env.FEATURE_PACKETA_ENABLED !== "1") {
      logger.debug("Packeta Tracking Sync: module disabled, skipping")
      return new StepResponse({ completed: false, reason: "disabled" })
    }

    const lockingService = container.resolve<ILockingModule>(Modules.LOCKING)
    try {
      await lockingService.execute(
        LOCK_KEY,
        async () => run(container, logger),
        { timeout: LOCK_TIMEOUT_SECONDS }
      )
    } catch (error) {
      if (error instanceof Error && error.message.includes("Timed-out")) {
        logger.debug(
          "Packeta Tracking Sync: lock held by another instance, skipping"
        )
        return new StepResponse({ completed: false, reason: "locked" })
      }
      throw error
    }

    return new StepResponse({ completed: true })
  }
)

const synchronizePacketaTrackingWorkflow = createWorkflow(
  "synchronize-packeta-tracking",
  (input: Record<string, never>) =>
    new WorkflowResponse(synchronizePacketaTrackingStep(input))
)

export default async function packetaTrackingSyncJob(
  container: MedusaContainer
) {
  await synchronizePacketaTrackingWorkflow(container).run({ input: {} })
}

export const config = {
  name: "packeta-tracking-sync",
  schedule: "*/15 * * * *",
}

async function run(container: MedusaContainer, logger: Logger) {
  const packetaClient = container.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("Packeta Tracking Sync: Starting...")

  const pending = await fetchPendingFulfillments(query, PROCESS_LIMIT)

  if (pending.length === 0) {
    logger.info("Packeta Tracking Sync: No pending fulfillments to check")
    return
  }

  logger.info(
    `Packeta Tracking Sync: Found ${pending.length} pending fulfillments`
  )

  const ctx: TrackingContext = { logger, fulfillmentService, eventBus }
  for (const fulfillment of pending) {
    try {
      await processFulfillment(ctx, packetaClient, fulfillment)
    } catch (error) {
      logger.error(
        `Packeta Tracking Sync: Failed to process fulfillment ${fulfillment.id}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  logger.info("Packeta Tracking Sync: Completed")
}

export async function fetchPendingFulfillments(
  query: Query,
  limit: number
): Promise<PendingFulfillment[]> {
  const pending: PendingFulfillment[] = []
  let skip = 0

  while (pending.length < limit) {
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "shipped_at", "delivered_at", "provider_id"],
      filters: {
        provider_id: "packeta_packeta",
        shipped_at: { $ne: null },
        delivered_at: null,
      },
      pagination: {
        order: { shipped_at: "ASC", id: "ASC" },
        skip,
        take: FETCH_PAGE_SIZE,
      },
    })
    const page = fulfillments as FulfillmentRecord[]
    if (page.length === 0) {
      break
    }

    pending.push(
      ...page.filter(
        (fulfillment): fulfillment is PendingFulfillment =>
          typeof fulfillment.data?.packet_id === "number" &&
          fulfillment.data.delivery_failed !== true
      )
    )
    if (page.length < FETCH_PAGE_SIZE) {
      break
    }

    skip += FETCH_PAGE_SIZE
  }

  return pending.slice(0, limit)
}

async function processFulfillment(
  ctx: TrackingContext,
  packetaClient: PacketaClientModuleService,
  fulfillment: PendingFulfillment
): Promise<void> {
  const { logger } = ctx
  const { packet_id: packetId } = fulfillment.data

  if (await flushPendingEvent(ctx, fulfillment)) {
    return
  }

  let history: PacketaPacketStatusRecord[]
  try {
    history = await packetaClient.getPacketStatus(packetId, {
      config_id: fulfillment.data.config_id,
      environment: fulfillment.data.environment,
    })
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
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data
  const deliveredAt = new Date(latest.dateTime)

  logger.info(
    `Packeta: Packet ${data.packet_id} delivered (${newStatus}) at ${deliveredAt.toISOString()}`
  )

  const pendingEvent = createCarrierSyncEvent(
    "packeta.delivered",
    `${fulfillment.id}:${data.packet_id}:${newStatus}`,
    {
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      barcode: data.barcode,
      delivered_at: deliveredAt.toISOString(),
      status: newStatus,
    }
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      packeta_pending_event: pendingEvent,
    },
  })

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { packeta_pending_event: _pendingEvent, ...updatedData } = data
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
  latest: PacketaPacketStatusRecord,
  newStatus: PacketaShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const data = fulfillment.data

  logger.warn(`Packeta: Packet ${data.packet_id} failed (${newStatus})`)

  const pendingEvent = createCarrierSyncEvent(
    "packeta.delivery_failed",
    `${fulfillment.id}:${data.packet_id}:${newStatus}`,
    {
      fulfillment_id: fulfillment.id,
      packet_id: data.packet_id,
      barcode: data.barcode,
      status: newStatus,
      status_date: latest.dateTime,
    }
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...data,
      last_status: newStatus,
      last_status_date: latest.dateTime,
      packeta_pending_event: pendingEvent,
    },
  })

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { packeta_pending_event: _pendingEvent, ...updatedData } = data
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
  const pendingEvent = getCarrierSyncEvent(
    fulfillment.data.packeta_pending_event,
    PACKETA_TRACKING_EVENTS
  )
  if (!pendingEvent) {
    return false
  }

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { packeta_pending_event: _pendingEvent, ...updatedData } =
    fulfillment.data
  const deliveredAtValue = pendingEvent.data.delivered_at
  const deliveredAt =
    typeof deliveredAtValue === "string" ? new Date(deliveredAtValue) : null
  const isDelivered =
    pendingEvent.name === "packeta.delivered" &&
    deliveredAt !== null &&
    !Number.isNaN(deliveredAt.getTime())

  await ctx.fulfillmentService.updateFulfillment(fulfillment.id, {
    ...(isDelivered ? { delivered_at: deliveredAt } : {}),
    data: {
      ...updatedData,
      ...(pendingEvent.name === "packeta.delivery_failed"
        ? { delivery_failed: true }
        : {}),
    },
  })
  return true
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
