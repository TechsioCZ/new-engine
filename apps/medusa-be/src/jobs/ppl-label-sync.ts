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
  PPL_CLIENT_MODULE,
  type PplBatchItem,
  type PplBatchResponse,
  type PplClientModuleService,
  type PplFulfillmentData,
} from "../modules/ppl-client"
import {
  checkTimeoutConditions,
  type FulfillmentRecord,
  type PendingFulfillment,
  type SyncAttemptInfo,
} from "../modules/ppl-client/utils"
import { executeWithLockTimeout } from "../utils/locking"

/** Lock key for preventing concurrent job runs */
const JOB_LOCK_KEY = "ppl-label-sync-job"

/** Lock timeout in seconds (2 minutes - should be longer than typical job duration) */
const JOB_LOCK_TIMEOUT = 120

/** Context passed to helper functions */
type SyncContext = {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  fileService: IFileModuleService
  eventBus: IEventBusModuleService
  pplClient: PplClientModuleService
}

/**
 * PPL Label Sync Job
 *
 * Runs every 1 minute to:
 * 1. Find fulfillments with status='pending' and batch_id
 * 2. Poll PPL for batch completion
 * 3. Download labels and upload to S3
 * 4. Update fulfillment data with shipment_number, label_url, etc.
 *
 * Uses distributed locking to prevent concurrent runs across multiple instances.
 */
export default async function pplLabelSyncJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  // Check global feature flag (module loaded)
  if (process.env["FEATURE_PPL_ENABLED"] !== "1") {
    logger.debug(
      "PPL Label Sync: PPL module is disabled (FEATURE_PPL_ENABLED != 1), skipping"
    )
    return
  }

  const pplClient = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  // Check runtime config (admin toggle)
  const config = await pplClient.getConfig()
  if (!config?.is_enabled) {
    logger.debug(
      "PPL Label Sync: PPL is disabled in settings (is_enabled = false), skipping"
    )
    return
  }

  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  // Use distributed lock to prevent concurrent job runs
  const result = await executeWithLockTimeout(
    lockingModule,
    JOB_LOCK_KEY,
    JOB_LOCK_TIMEOUT,
    async () => {
      await executeSync(container, pplClient, logger)
    }
  )

  if (result.status === "timed_out") {
    logger.info(
      "PPL Label Sync: Skipping - another instance is already running"
    )
  }
}

/**
 * Execute the actual sync logic (wrapped by distributed lock)
 */
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

  try {
    const ctx: SyncContext = {
      logger,
      fulfillmentService,
      fileService,
      eventBus,
      pplClient,
    }

    const pendingFulfillments = await fetchPendingFulfillments(query)

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
  } catch (error) {
    logger.error(
      "PPL Label Sync failed",
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

export const config = {
  name: "ppl-label-sync",
  schedule: "*/1 * * * *",
}

/**
 * Fetch pending PPL fulfillments from database
 */
async function fetchPendingFulfillments(
  query: Query
): Promise<PendingFulfillment[]> {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "created_at", "provider_id"],
    filters: {
      provider_id: "ppl_ppl",
    },
  })

  // JSON field filtering (data.status, data.batch_id) must be done in-memory
  return (fulfillments as FulfillmentRecord[]).filter(
    (f): f is PendingFulfillment =>
      f.data?.status === "pending" && typeof f.data?.batch_id === "string"
  )
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

  try {
    // Check for timeout conditions
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

    const batchResult = await pplClient.getBatchStatus(batchId)
    await handleBatchResult(ctx, fulfillment, batchResult, attemptInfo)
  } catch (error) {
    logger.error(
      `PPL Label Sync: Error processing fulfillment ${fulfillment.id}: ${error instanceof Error ? error.message : String(error)}`
    )

    await updateAttemptCount(ctx, fulfillment, attemptInfo)
  }
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
  const { logger, fulfillmentService, eventBus } = ctx
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
    labelUrl
  )

  const trackingUrl =
    pplTrackingUrl ||
    `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${shipmentNumber}`

  // Update fulfillment with completed data
  const updatedData: PplFulfillmentData = {
    ...fulfillmentData,
    status: "completed",
    shipment_number: shipmentNumber,
    ppl_label_url: labelUrl,
    label_url: storedLabelUrl,
    tracking_url: trackingUrl,
    sync_attempts: attemptInfo.syncAttempts,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    last_sync_attempt: attemptInfo.now,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: updatedData,
  })

  logger.info(
    `PPL Label Sync: Fulfillment ${fulfillment.id} completed - Shipment: ${shipmentNumber}`
  )

  await eventBus.emit({
    name: "fulfillment.label_ready",
    data: {
      fulfillment_id: fulfillment.id,
      shipment_number: shipmentNumber,
      label_url: storedLabelUrl,
      tracking_url: trackingUrl,
    },
  })
}

/**
 * Download label from PPL and upload to S3
 */
async function downloadAndStoreLabel(
  ctx: SyncContext,
  shipmentNumber: string,
  labelUrl: string
): Promise<string> {
  const { logger, fileService, pplClient } = ctx

  try {
    const labelBuffer = await pplClient.downloadLabel(labelUrl)

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
  const { fulfillmentService, eventBus } = ctx
  const fulfillmentData = fulfillment.data

  const updatedData: PplFulfillmentData = {
    ...fulfillmentData,
    status: "error",
    error_message: errorMessage,
    sync_attempts: attemptInfo.syncAttempts,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    last_sync_attempt: attemptInfo.now,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: updatedData,
  })

  await eventBus.emit({
    name: "fulfillment.label_failed",
    data: {
      fulfillment_id: fulfillment.id,
      batch_id: fulfillmentData.batch_id,
      error_message: errorMessage,
    },
  })
}
