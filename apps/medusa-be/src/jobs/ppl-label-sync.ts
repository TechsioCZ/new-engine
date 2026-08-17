import type { MedusaContainer } from "@medusajs/framework"
import type {
  IEventBusModuleService,
  IFileModuleService,
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
  type PplBatchItem,
  type PplBatchResponse,
  type PplClientModuleService,
  type PplFulfillmentData,
} from "../modules/ppl-client"
import {
  checkTimeoutConditions,
  type FulfillmentRecord,
  getPplConfigReference,
  type PendingFulfillment,
  type SyncAttemptInfo,
} from "../modules/ppl-client/utils"
import {
  createCarrierSyncEvent,
  emitCarrierSyncEvent,
  getCarrierSyncEvent,
} from "../utils/carrier-sync-event"

const JOB_LOCK_KEY = "ppl-label-sync-job"
const JOB_LOCK_TIMEOUT = 120
const FETCH_PAGE_SIZE = 100
const PROCESS_LIMIT = 100
const PPL_LABEL_EVENTS = [
  "fulfillment.label_ready",
  "fulfillment.label_failed",
] as const

type SyncContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  fileService: IFileModuleService
  eventBus: IEventBusModuleService
  pplClient: PplClientModuleService
}

const synchronizePplLabelsStep = createStep(
  "synchronize-ppl-labels",
  async (_input: Record<string, never>, { container }) => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    if (process.env.FEATURE_PPL_ENABLED !== "1") {
      logger.debug("PPL Label Sync: module disabled, skipping")
      return new StepResponse({ completed: false, reason: "disabled" })
    }

    const pplClient =
      container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)
    const config = await pplClient.getConfig()
    if (!config?.is_enabled) {
      logger.debug("PPL Label Sync: disabled in settings, skipping")
      return new StepResponse({ completed: false, reason: "disabled" })
    }

    const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)
    try {
      await lockingModule.execute(
        JOB_LOCK_KEY,
        async () => executeSync(container, pplClient, logger),
        { timeout: JOB_LOCK_TIMEOUT }
      )
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Timed-out acquiring lock")
      ) {
        logger.info("PPL Label Sync: another instance is running, skipping")
        return new StepResponse({ completed: false, reason: "locked" })
      }
      throw error
    }

    return new StepResponse({ completed: true })
  }
)

const synchronizePplLabelsWorkflow = createWorkflow(
  "synchronize-ppl-labels",
  (input: Record<string, never>) =>
    new WorkflowResponse(synchronizePplLabelsStep(input))
)

export default async function pplLabelSyncJob(container: MedusaContainer) {
  await synchronizePplLabelsWorkflow(container).run({ input: {} })
}

async function executeSync(
  container: MedusaContainer,
  pplClient: PplClientModuleService,
  logger: Logger
): Promise<void> {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT
  )
  const fileService = container.resolve<IFileModuleService>(Modules.FILE)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("PPL Label Sync: Starting...")

  const ctx: SyncContext = {
    logger,
    fulfillmentService,
    fileService,
    eventBus,
    pplClient,
  }

  const pendingFulfillments = await fetchPendingFulfillments(
    query,
    PROCESS_LIMIT
  )

  if (pendingFulfillments.length === 0) {
    logger.info("PPL Label Sync: No pending fulfillments to process")
    return
  }

  logger.info(
    `PPL Label Sync: Found ${pendingFulfillments.length} pending fulfillments`
  )

  for (const fulfillment of pendingFulfillments) {
    await processFulfillment(ctx, fulfillment)
  }

  logger.info("PPL Label Sync: Completed")
}

export const config = {
  name: "ppl-label-sync",
  schedule: "*/1 * * * *",
}

/**
 * Fetch pending PPL fulfillments from database
 */
export async function fetchPendingFulfillments(
  query: Query,
  limit: number
): Promise<PendingFulfillment[]> {
  const pending: PendingFulfillment[] = []
  let skip = 0

  while (pending.length < limit) {
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: ["id", "data", "created_at", "provider_id"],
      filters: {
        provider_id: "ppl_ppl",
      },
      pagination: {
        order: { created_at: "ASC", id: "ASC" },
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
          fulfillment.data?.status === "pending" &&
          typeof fulfillment.data?.batch_id === "string"
      )
    )
    if (page.length < FETCH_PAGE_SIZE) {
      break
    }

    skip += FETCH_PAGE_SIZE
  }

  return pending.slice(0, limit)
}

/**
 * Process a single pending fulfillment
 */
async function processFulfillment(
  ctx: SyncContext,
  fulfillment: PendingFulfillment
): Promise<void> {
  const { logger, pplClient } = ctx
  const fulfillmentData = fulfillment.data
  const batchId = fulfillmentData.batch_id
  const now = new Date().toISOString()

  const attemptInfo: SyncAttemptInfo = {
    syncAttempts: (fulfillmentData.sync_attempts || 0) + 1,
    firstSyncAttempt: fulfillmentData.first_sync_attempt || now,
    now,
  }

  if (await flushPendingEvent(ctx, fulfillment)) {
    return
  }

  const timeoutError = checkTimeoutConditions(fulfillment, attemptInfo)
  if (timeoutError) {
    logger.error(
      `PPL Label Sync: Fulfillment ${fulfillment.id} ${timeoutError.reason}`
    )
    await markAsError(ctx, fulfillment, timeoutError.message, attemptInfo)
    return
  }

  logger.debug(
    `PPL Label Sync: Checking batch ${batchId} for fulfillment ${fulfillment.id} (attempt ${attemptInfo.syncAttempts})`
  )

  let batchResult: PplBatchResponse
  try {
    batchResult = await pplClient.getBatchStatus(
      batchId,
      getPplConfigReference(fulfillmentData)
    )
  } catch (error) {
    logger.error(
      `PPL Label Sync: Failed to read batch ${batchId}: ${error instanceof Error ? error.message : String(error)}`
    )
    await updateAttemptCount(ctx, fulfillment, attemptInfo)
    return
  }

  await handleBatchResult(ctx, fulfillment, batchResult, attemptInfo)
}

/**
 * Handle batch result based on item import state
 */
async function handleBatchResult(
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  batchResult: PplBatchResponse,
  attemptInfo: SyncAttemptInfo
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data
  const item = batchResult.items[0]

  if (!item) {
    await markAsError(
      ctx,
      fulfillment,
      "Batch response has no items",
      attemptInfo
    )
    return
  }

  if (item.importState === "Complete") {
    await handleCompletedItem(ctx, fulfillment, item, attemptInfo)
  } else if (item.importState === "Error" || item.errorMessage) {
    await markAsError(
      ctx,
      fulfillment,
      `PPL error: ${item.errorMessage || "Unknown error"}`,
      attemptInfo
    )
  } else {
    // Still processing (Received or InProcess)
    logger.debug(
      `PPL Label Sync: Batch ${fulfillmentData.batch_id} still processing (${item.importState}), will retry`
    )

    await fulfillmentService.updateFulfillment(fulfillment.id, {
      data: {
        ...fulfillmentData,
        sync_attempts: attemptInfo.syncAttempts,
        first_sync_attempt: attemptInfo.firstSyncAttempt,
        last_sync_attempt: attemptInfo.now,
      },
    })
  }
}

/**
 * Handle a completed item - validate, download label, update fulfillment
 */
async function handleCompletedItem(
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  item: PplBatchItem,
  attemptInfo: SyncAttemptInfo
): Promise<void> {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  // Validate item has required fields
  if (!(item.shipmentNumber && item.labelUrl)) {
    await markAsError(
      ctx,
      fulfillment,
      "Batch completed but missing shipment number or label URL",
      attemptInfo
    )
    return
  }

  const { shipmentNumber, labelUrl, trackingUrl: pplTrackingUrl } = item

  // Download and store label
  const storedLabelUrl = await downloadAndStoreLabel(
    ctx,
    shipmentNumber,
    labelUrl,
    fulfillmentData
  )

  const trackingUrl =
    pplTrackingUrl ||
    `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${shipmentNumber}`

  // Update fulfillment with completed data
  const pendingEvent = createCarrierSyncEvent(
    "fulfillment.label_ready",
    `${fulfillment.id}:${shipmentNumber}`,
    {
      fulfillment_id: fulfillment.id,
      shipment_number: shipmentNumber,
      label_url: storedLabelUrl,
      tracking_url: trackingUrl,
    }
  )
  const updatedData: PplFulfillmentData = {
    ...fulfillmentData,
    status: "pending",
    shipment_number: shipmentNumber,
    ppl_label_url: labelUrl,
    label_url: storedLabelUrl,
    tracking_url: trackingUrl,
    sync_attempts: attemptInfo.syncAttempts,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    last_sync_attempt: attemptInfo.now,
    ppl_label_pending_event: pendingEvent,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: updatedData,
  })

  logger.info(
    `PPL Label Sync: Fulfillment ${fulfillment.id} completed - Shipment: ${shipmentNumber}`
  )

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_label_pending_event: _pendingEvent, ...completedData } =
    updatedData
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...completedData,
      status: "completed",
    },
  })
}

/**
 * Download label from PPL and upload to S3
 */
async function downloadAndStoreLabel(
  ctx: SyncContext,
  shipmentNumber: string,
  labelUrl: string,
  fulfillmentData: PplFulfillmentData
): Promise<string> {
  const { logger, fileService, pplClient } = ctx

  try {
    const labelBuffer = await pplClient.downloadLabel(
      labelUrl,
      getPplConfigReference(fulfillmentData)
    )

    const uploadedFiles = await fileService.createFiles([
      {
        filename: `ppl-label-${shipmentNumber}.png`,
        mimeType: "image/png",
        content: labelBuffer.toString("base64"),
      },
    ])

    if (uploadedFiles[0]) {
      logger.info(
        `PPL Label Sync: Label for ${shipmentNumber} stored at ${uploadedFiles[0].url}`
      )
      return uploadedFiles[0].url
    }
  } catch (error) {
    logger.warn(
      `PPL Label Sync: Failed to store label in S3 for ${shipmentNumber}: ${error instanceof Error ? error.message : String(error)}. Using PPL URL.`
    )
  }

  return labelUrl
}

/**
 * Update attempt count without marking as error
 */
async function updateAttemptCount(
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  attemptInfo: SyncAttemptInfo
): Promise<void> {
  const { fulfillmentService, logger } = ctx

  try {
    await fulfillmentService.updateFulfillment(fulfillment.id, {
      data: {
        ...fulfillment.data,
        sync_attempts: attemptInfo.syncAttempts,
        first_sync_attempt: attemptInfo.firstSyncAttempt,
        last_sync_attempt: attemptInfo.now,
      },
    })
  } catch (error) {
    logger.error(
      `PPL Label Sync: Failed to update attempt count for ${fulfillment.id}`,
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

/**
 * Mark fulfillment as error and emit event
 */
async function markAsError(
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  errorMessage: string,
  attemptInfo: SyncAttemptInfo
): Promise<void> {
  const { fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data

  const pendingEvent = createCarrierSyncEvent(
    "fulfillment.label_failed",
    `${fulfillment.id}:${fulfillmentData.batch_id}:${attemptInfo.syncAttempts}`,
    {
      fulfillment_id: fulfillment.id,
      batch_id: fulfillmentData.batch_id,
      error_message: errorMessage,
    }
  )
  const updatedData: PplFulfillmentData = {
    ...fulfillmentData,
    status: "pending",
    error_message: errorMessage,
    sync_attempts: attemptInfo.syncAttempts,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    last_sync_attempt: attemptInfo.now,
    ppl_label_pending_event: pendingEvent,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: updatedData,
  })

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_label_pending_event: _pendingEvent, ...errorData } = updatedData
  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...errorData,
      status: "error",
    },
  })
}

async function flushPendingEvent(
  ctx: SyncContext,
  fulfillment: PendingFulfillment
): Promise<boolean> {
  const pendingEvent = getCarrierSyncEvent(
    fulfillment.data.ppl_label_pending_event,
    PPL_LABEL_EVENTS
  )
  if (!pendingEvent) {
    return false
  }

  await emitCarrierSyncEvent(ctx.eventBus, pendingEvent)
  const { ppl_label_pending_event: _pendingEvent, ...updatedData } =
    fulfillment.data
  await ctx.fulfillmentService.updateFulfillment(fulfillment.id, {
    data: {
      ...updatedData,
      status:
        pendingEvent.name === "fulfillment.label_ready" ? "completed" : "error",
    },
  })
  return true
}
