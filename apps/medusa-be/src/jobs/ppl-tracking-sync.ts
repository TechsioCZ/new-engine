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
  PPL_CLIENT_MODULE,
  PPL_DELIVERED_STATES,
  PPL_FAILED_STATES,
  type PplClientModuleService,
  type PplFulfillmentData,
  type PplShipmentInfo,
  type PplShipmentState,
} from "../modules/ppl-client"
import { getPplConfigReference } from "../modules/ppl-client/utils"
import {
  createCarrierSyncEvent,
  emitCarrierSyncEvent,
  getCarrierSyncEvent,
} from "../utils/carrier-sync-event"

// Types
type FulfillmentRecord = {
  id: string
  data: PplFulfillmentData | null
  shipped_at: string | null
  delivered_at: string | null
  provider_id: string
}

interface PendingFulfillment extends FulfillmentRecord {
  data: PplFulfillmentData & { shipment_number: string }
}

type TrackingContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  eventBus: IEventBusModuleService
}

type TrackingBatch = {
  shipmentNumbers: string[]
  fulfillmentMap: Map<string, PendingFulfillment>
  referenceFulfillment: PendingFulfillment | undefined
}

const BATCH_SIZE = 100
const FETCH_PAGE_SIZE = 100
const PROCESS_LIMIT = 100
const LOCK_KEY = "ppl-tracking-sync-job"
const LOCK_TIMEOUT_SECONDS = 120
const PPL_TRACKING_EVENTS = ["ppl.delivered", "ppl.delivery_failed"] as const

const synchronizePplTrackingStep = createStep(
  "synchronize-ppl-tracking",
  async (_input: Record<string, never>, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    if (process.env.FEATURE_PPL_ENABLED !== "1") {
      logger.debug("PPL Tracking Sync: module disabled, skipping")
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
          "PPL Tracking Sync: lock held by another instance, skipping"
        )
        return new StepResponse({ completed: false, reason: "locked" })
      }
      throw error
    }

    return new StepResponse({ completed: true })
  }
)

const synchronizePplTrackingWorkflow = createWorkflow(
  "synchronize-ppl-tracking",
  (input: Record<string, never>) =>
    new WorkflowResponse(synchronizePplTrackingStep(input))
)

export default async function pplTrackingSyncJob(container: MedusaContainer) {
  await synchronizePplTrackingWorkflow(container).run({ input: {} })
}

async function run(container: MedusaContainer, logger: Logger) {
  const pplClient = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  const config = await pplClient.getConfig()
  if (!config?.is_enabled) {
    logger.debug(
      "PPL Tracking Sync: PPL is disabled in settings (is_enabled = false), skipping"
    )
    return
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("PPL Tracking Sync: Starting...")

  const pendingFulfillments = await fetchPendingFulfillments(
    query,
    PROCESS_LIMIT
  )

  if (pendingFulfillments.length === 0) {
    logger.info("PPL Tracking Sync: No pending fulfillments to check")
    return
  }

  logger.info(
    `PPL Tracking Sync: Found ${pendingFulfillments.length} pending fulfillments`
  )

  const ctx: TrackingContext = { logger, fulfillmentService, eventBus }
  await processFulfillmentsInBatches(ctx, pplClient, pendingFulfillments)

  logger.info("PPL Tracking Sync: Completed")
}

export const config = {
  name: "ppl-tracking-sync",
  schedule: "*/15 * * * *",
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
        provider_id: "ppl_ppl",
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
          typeof fulfillment.data?.shipment_number === "string" &&
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

async function processFulfillmentsInBatches(
  ctx: TrackingContext,
  pplClient: PplClientModuleService,
  fulfillments: PendingFulfillment[]
): Promise<void> {
  const groups = new Map<string, PendingFulfillment[]>()

  for (const fulfillment of fulfillments) {
    if (await flushPendingEvent(ctx, fulfillment)) {
      continue
    }

    const reference = getPplConfigReference(fulfillment.data)
    const key = `${reference?.config_id ?? "active"}:${reference?.environment ?? "active"}`
    const group = groups.get(key) ?? []
    group.push(fulfillment)
    groups.set(key, group)
  }

  for (const group of groups.values()) {
    const fulfillmentMap = new Map(
      group.map((fulfillment) => [
        fulfillment.data.shipment_number,
        fulfillment,
      ])
    )
    const shipmentNumbers = [...fulfillmentMap.keys()]

    for (let index = 0; index < shipmentNumbers.length; index += BATCH_SIZE) {
      const batch = shipmentNumbers.slice(index, index + BATCH_SIZE)
      await processBatch(ctx, pplClient, {
        shipmentNumbers: batch,
        fulfillmentMap,
        referenceFulfillment: group[0],
      })
    }
  }
}

async function processBatch(
  ctx: TrackingContext,
  pplClient: PplClientModuleService,
  batch: TrackingBatch
): Promise<void> {
  const { fulfillmentMap, referenceFulfillment, shipmentNumbers } = batch
  let shipmentInfos: PplShipmentInfo[]
  try {
    shipmentInfos = await pplClient.getShipmentInfo(
      { shipmentNumbers },
      getPplConfigReference(referenceFulfillment?.data)
    )
  } catch (error) {
    ctx.logger.warn(
      `PPL Tracking Sync: Failed to fetch batch status: ${error instanceof Error ? error.message : String(error)}`
    )
    return
  }

  const returnedNumbers = new Set(
    shipmentInfos.map((info) => info.shipmentNumber)
  )
  const missingNumbers = shipmentNumbers.filter(
    (shipmentNumber) => !returnedNumbers.has(shipmentNumber)
  )
  if (missingNumbers.length > 0) {
    ctx.logger.warn(
      `PPL Tracking Sync: ${missingNumbers.length} shipments not found in PPL response (batch ${shipmentNumbers[0]}...): ${missingNumbers.join(", ")}`
    )
  }

  for (const info of shipmentInfos) {
    const fulfillment = fulfillmentMap.get(info.shipmentNumber)
    if (!fulfillment) {
      continue
    }

    try {
      await processFulfillmentStatus(ctx, fulfillment, info)
    } catch (error) {
      ctx.logger.error(
        `PPL Tracking Sync: Failed to process fulfillment ${fulfillment.id}`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }
}

async function processFulfillmentStatus(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo
): Promise<void> {
  const fulfillmentData = fulfillment.data
  const currentStatus = fulfillmentData.last_status
  const newStatus = info.shipmentState as PplShipmentState

  if (currentStatus === newStatus) {
    return
  }

  ctx.logger.info(
    `PPL: Shipment ${fulfillmentData.shipment_number} status changed: ${currentStatus || "unknown"} -> ${newStatus}`
  )

  if (PPL_DELIVERED_STATES.includes(newStatus)) {
    await handleDelivered(ctx, fulfillment, info, newStatus)
  } else if (PPL_FAILED_STATES.includes(newStatus)) {
    await handleFailed(ctx, fulfillment, info, newStatus)
  } else {
    await handleInTransit(ctx, fulfillment, info, newStatus)
  }
}

async function handleDelivered(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  logger.info(
    `PPL: Shipment ${fulfillmentData.shipment_number} delivered (${newStatus})`
  )

  const deliveredAt = info.deliveryDate
    ? new Date(info.deliveryDate)
    : new Date()

  const pendingEvent = createCarrierSyncEvent(
    "ppl.delivered",
    `${fulfillment.id}:${fulfillmentData.shipment_number}:${newStatus}`,
    {
      fulfillment_id: fulfillment.id,
      shipment_number: fulfillmentData.shipment_number,
      delivered_at: deliveredAt.toISOString(),
      status: newStatus,
    }
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      last_status: newStatus,
      last_status_date: info.stateDate,
      ppl_tracking_pending_event: pendingEvent,
    },
  })

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_tracking_pending_event: _pendingEvent, ...updatedData } =
    fulfillmentData
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    delivered_at: deliveredAt,
    data: {
      ...updatedData,
      last_status: newStatus,
      last_status_date: info.stateDate,
    },
  })
}

async function handleFailed(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  logger.warn(
    `PPL: Shipment ${fulfillmentData.shipment_number} failed (${newStatus})`
  )

  const pendingEvent = createCarrierSyncEvent(
    "ppl.delivery_failed",
    `${fulfillment.id}:${fulfillmentData.shipment_number}:${newStatus}`,
    {
      fulfillment_id: fulfillment.id,
      shipment_number: fulfillmentData.shipment_number,
      status: newStatus,
      status_date: info.stateDate,
    }
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      last_status: newStatus,
      last_status_date: info.stateDate,
      ppl_tracking_pending_event: pendingEvent,
    },
  })

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_tracking_pending_event: _pendingEvent, ...updatedData } =
    fulfillmentData
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...updatedData,
      last_status: newStatus,
      last_status_date: info.stateDate,
      delivery_failed: true,
    },
  })
}

async function flushPendingEvent(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment
): Promise<boolean> {
  const pendingEvent = getCarrierSyncEvent(
    fulfillment.data.ppl_tracking_pending_event,
    PPL_TRACKING_EVENTS
  )
  if (!pendingEvent) {
    return false
  }

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_tracking_pending_event: _pendingEvent, ...updatedData } =
    fulfillment.data
  const deliveredAtValue = pendingEvent.data.delivered_at
  const deliveredAt =
    typeof deliveredAtValue === "string" ? new Date(deliveredAtValue) : null
  const isDelivered =
    pendingEvent.name === "ppl.delivered" &&
    deliveredAt !== null &&
    !Number.isNaN(deliveredAt.getTime())

  await ctx.fulfillmentService.updateFulfillment(fulfillment.id, {
    ...(isDelivered ? { delivered_at: deliveredAt } : {}),
    data: {
      ...updatedData,
      ...(pendingEvent.name === "ppl.delivery_failed"
        ? { delivery_failed: true }
        : {}),
    },
  })
  return true
}

async function handleInTransit(
  ctx: TrackingContext,
  fulfillment: PendingFulfillment,
  info: PplShipmentInfo,
  newStatus: PplShipmentState
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  logger.debug(
    `PPL: Shipment ${fulfillmentData.shipment_number} status: ${newStatus}`
  )

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...fulfillmentData,
      last_status: newStatus,
      last_status_date: info.stateDate,
    },
  })
}
