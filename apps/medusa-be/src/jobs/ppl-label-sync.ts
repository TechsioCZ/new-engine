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

import { PPL_CLIENT_MODULE } from "../modules/ppl-client"
import type {
  PplBatchItem,
  PplBatchResponse,
  PplClientModuleService,
} from "../modules/ppl-client"
import {
  checkTimeoutConditions,
  parsePendingFulfillment,
} from "../modules/ppl-client/utils"
import type {
  PendingFulfillment,
  SyncAttemptInfo,
} from "../modules/ppl-client/utils"
import { executeWithLockTimeout } from "../utils/locking"

/** Lock key for preventing concurrent job runs */
const JOB_LOCK_KEY = "ppl-label-sync-job"

/** Lock timeout in seconds (2 minutes - should be longer than typical job duration) */
const JOB_LOCK_TIMEOUT = 120

/** Context passed to helper functions */
interface SyncContext {
  logger: Logger
  fulfillmentService: IFulfillmentModuleService
  fileService: IFileModuleService
  eventBus: IEventBusModuleService
  pplClient: PplClientModuleService
}

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === "string" && value.length > 0

/**
 * Fetch pending PPL fulfillments from database
 */
const fetchPendingFulfillments = async (
  query: Query,
): Promise<PendingFulfillment[]> => {
  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "created_at", "provider_id"],
    filters: {
      provider_id: "ppl_ppl",
    },
  })

  // JSON field filtering (data.status, data.batch_id) must be done in-memory
  const rawFulfillments: unknown = fulfillments
  return Array.isArray(rawFulfillments)
    ? rawFulfillments.flatMap((fulfillment) => {
        const parsed = parsePendingFulfillment(fulfillment)
        return parsed === null ? [] : [parsed]
      })
    : []
}

/**
 * Download label from PPL and upload to S3
 */
const downloadAndStoreLabel = async (
  ctx: SyncContext,
  shipmentNumber: string,
  labelUrl: string,
): Promise<string> => {
  const { logger, fileService, pplClient } = ctx

  try {
    const labelBuffer = await pplClient.downloadLabel(labelUrl)

    const uploadedFiles = await fileService.createFiles([
      {
        content: labelBuffer.toString("base64"),
        filename: `ppl-label-${shipmentNumber}.png`,
        mimeType: "image/png",
      },
    ])

    if (uploadedFiles[0]) {
      logger.info(
        `PPL Label Sync: Label for ${shipmentNumber} stored at ${uploadedFiles[0].url}`,
      )
      return uploadedFiles[0].url
    }
  } catch (error) {
    logger.warn(
      `PPL Label Sync: Failed to store label in S3 for ${shipmentNumber}: ${error instanceof Error ? error.message : String(error)}. Using PPL URL.`,
    )
  }

  return labelUrl
}

/**
 * Update attempt count without marking as error
 */
const updateAttemptCount = async (
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  attemptInfo: SyncAttemptInfo,
): Promise<void> => {
  const { fulfillmentService, logger } = ctx

  try {
    await fulfillmentService.updateFulfillment(fulfillment.id, {
      data: {
        ...fulfillment.data,
        first_sync_attempt: attemptInfo.firstSyncAttempt,
        last_sync_attempt: attemptInfo.now,
        sync_attempts: attemptInfo.syncAttempts,
      },
    })
  } catch (error) {
    logger.error(
      `PPL Label Sync: Failed to update attempt count for ${fulfillment.id}`,
      error instanceof Error ? error : new Error(String(error)),
    )
  }
}

/**
 * Mark fulfillment as error and emit event
 */
const markAsError = async (
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  errorMessage: string,
  attemptInfo: SyncAttemptInfo,
): Promise<void> => {
  const { fulfillmentService, eventBus } = ctx
  const fulfillmentData = fulfillment.data

  const updatedData = {
    ...fulfillmentData,
    error_message: errorMessage,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    last_sync_attempt: attemptInfo.now,
    status: "error",
    sync_attempts: attemptInfo.syncAttempts,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: { ...updatedData },
  })

  await eventBus.emit({
    data: {
      batch_id: fulfillmentData.batch_id,
      error_message: errorMessage,
      fulfillment_id: fulfillment.id,
    },
    name: "fulfillment.label_failed",
  })
}

/**
 * Handle a completed item - validate, download label, update fulfillment
 */
const handleCompletedItem = async (
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  item: PplBatchItem,
  attemptInfo: SyncAttemptInfo,
): Promise<void> => {
  const { logger, fulfillmentService, eventBus } = ctx
  const fulfillmentData = fulfillment.data

  // Validate item has required fields
  if (
    !(isNonEmptyString(item.shipmentNumber) && isNonEmptyString(item.labelUrl))
  ) {
    await markAsError(
      ctx,
      fulfillment,
      "Batch completed but missing shipment number or label URL",
      attemptInfo,
    )
    return
  }

  const { shipmentNumber, labelUrl, trackingUrl: pplTrackingUrl } = item

  // Download and store label
  const storedLabelUrl = await downloadAndStoreLabel(
    ctx,
    shipmentNumber,
    labelUrl,
  )

  const trackingUrl =
    pplTrackingUrl ??
    `https://www.ppl.cz/vyhledat-zasilku?shipmentId=${shipmentNumber}`

  // Update fulfillment with completed data
  const updatedData = {
    ...fulfillmentData,
    first_sync_attempt: attemptInfo.firstSyncAttempt,
    label_url: storedLabelUrl,
    last_sync_attempt: attemptInfo.now,
    ppl_label_url: labelUrl,
    shipment_number: shipmentNumber,
    status: "completed",
    sync_attempts: attemptInfo.syncAttempts,
    tracking_url: trackingUrl,
  }

  await fulfillmentService.updateFulfillment(fulfillment.id, {
    data: { ...updatedData },
  })

  logger.info(
    `PPL Label Sync: Fulfillment ${fulfillment.id} completed - Shipment: ${shipmentNumber}`,
  )

  await eventBus.emit({
    data: {
      fulfillment_id: fulfillment.id,
      label_url: storedLabelUrl,
      shipment_number: shipmentNumber,
      tracking_url: trackingUrl,
    },
    name: "fulfillment.label_ready",
  })
}

/**
 * Handle batch result based on item import state
 */
const handleBatchResult = async (
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
  batchResult: PplBatchResponse,
  attemptInfo: SyncAttemptInfo,
): Promise<void> => {
  const { logger, fulfillmentService } = ctx
  const fulfillmentData = fulfillment.data
  const [item] = batchResult.items

  if (!item) {
    await markAsError(
      ctx,
      fulfillment,
      "Batch response has no items",
      attemptInfo,
    )
    return
  }

  if (item.importState === "Complete") {
    await handleCompletedItem(ctx, fulfillment, item, attemptInfo)
  } else if (
    item.importState === "Error" ||
    isNonEmptyString(item.errorMessage)
  ) {
    await markAsError(
      ctx,
      fulfillment,
      `PPL error: ${item.errorMessage ?? "Unknown error"}`,
      attemptInfo,
    )
  } else {
    // Still processing (Received or InProcess)
    logger.debug(
      `PPL Label Sync: Batch ${fulfillmentData.batch_id} still processing (${item.importState}), will retry`,
    )

    await fulfillmentService.updateFulfillment(fulfillment.id, {
      data: {
        ...fulfillmentData,
        first_sync_attempt: attemptInfo.firstSyncAttempt,
        last_sync_attempt: attemptInfo.now,
        sync_attempts: attemptInfo.syncAttempts,
      },
    })
  }
}

/**
 * Process a single pending fulfillment
 */
const processFulfillment = async (
  ctx: SyncContext,
  fulfillment: PendingFulfillment,
): Promise<void> => {
  const { logger, pplClient } = ctx
  const fulfillmentData = fulfillment.data
  const batchId = fulfillmentData.batch_id
  const now = new Date().toISOString()

  const attemptInfo: SyncAttemptInfo = {
    firstSyncAttempt: fulfillmentData.first_sync_attempt ?? now,
    now,
    syncAttempts: (fulfillmentData.sync_attempts ?? 0) + 1,
  }

  try {
    // Check for timeout conditions
    const timeoutError = checkTimeoutConditions(fulfillment, attemptInfo)
    if (timeoutError) {
      logger.error(
        `PPL Label Sync: Fulfillment ${fulfillment.id} ${timeoutError.reason}`,
      )
      await markAsError(ctx, fulfillment, timeoutError.message, attemptInfo)
      return
    }

    logger.debug(
      `PPL Label Sync: Checking batch ${batchId} for fulfillment ${fulfillment.id} (attempt ${attemptInfo.syncAttempts})`,
    )

    const batchResult = await pplClient.getBatchStatus(batchId)
    await handleBatchResult(ctx, fulfillment, batchResult, attemptInfo)
  } catch (error) {
    logger.error(
      `PPL Label Sync: Error processing fulfillment ${fulfillment.id}: ${error instanceof Error ? error.message : String(error)}`,
    )

    await updateAttemptCount(ctx, fulfillment, attemptInfo)
  }
}

// Pending fulfillments are processed one at a time (not Promise.all) because
// each fulfillment's PPL batch lookup, label download, and S3 upload must
// complete before moving to the next. Bounded tail recursion replaces a
// for-of/await loop so each item still runs strictly after the previous one.
const processPendingFulfillments = async (
  ctx: SyncContext,
  pendingFulfillments: PendingFulfillment[],
  index: number,
): Promise<void> => {
  const fulfillment = pendingFulfillments[index]
  if (!fulfillment) {
    return
  }

  await processFulfillment(ctx, fulfillment)

  await processPendingFulfillments(ctx, pendingFulfillments, index + 1)
}

/**
 * Execute the actual sync logic (wrapped by distributed lock)
 */
const executeSync = async (
  container: MedusaContainer,
  pplClient: PplClientModuleService,
  logger: Logger,
): Promise<void> => {
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const fulfillmentService = container.resolve<IFulfillmentModuleService>(
    Modules.FULFILLMENT,
  )
  const fileService = container.resolve<IFileModuleService>(Modules.FILE)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  logger.info("PPL Label Sync: Starting...")

  try {
    const ctx: SyncContext = {
      eventBus,
      fileService,
      fulfillmentService,
      logger,
      pplClient,
    }

    const pendingFulfillments = await fetchPendingFulfillments(query)

    if (pendingFulfillments.length === 0) {
      logger.info("PPL Label Sync: No pending fulfillments to process")
      return
    }

    logger.info(
      `PPL Label Sync: Found ${pendingFulfillments.length} pending fulfillments`,
    )

    await processPendingFulfillments(ctx, pendingFulfillments, 0)

    logger.info("PPL Label Sync: Completed")
  } catch (error) {
    logger.error(
      "PPL Label Sync failed",
      error instanceof Error ? error : new Error(String(error)),
    )
  }
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
      "PPL Label Sync: PPL module is disabled (FEATURE_PPL_ENABLED != 1), skipping",
    )
    return
  }

  const pplClient = container.resolve<PplClientModuleService>(PPL_CLIENT_MODULE)

  // Check runtime config (admin toggle)
  const config = await pplClient.getConfig()
  if (config === null || !config.is_enabled) {
    logger.debug(
      "PPL Label Sync: PPL is disabled in settings (is_enabled = false), skipping",
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
    },
  )

  if (result.status === "timed_out") {
    logger.info(
      "PPL Label Sync: Skipping - another instance is already running",
    )
  }
}

export const config = {
  name: "ppl-label-sync",
  schedule: "*/1 * * * *",
}
