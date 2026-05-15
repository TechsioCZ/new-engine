import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import type { ILockingModule, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  SYMMY_IMPORT_JOB_MODULE,
  type SymmyImportJobDTO,
  type SymmyImportJobModuleService,
} from "../modules/import-job"
import {
  SYMMY_WEBHOOK_CONFIG_MODULE,
  type SymmyWebhookConfigModuleService,
  type SymmyWebhookJobPayload,
} from "../modules/webhook-config"
import { upsertProductsBatchWorkflow } from "../workflows/upsert-products-batch"
import {
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
  type SymmyProductsUpsertRequestedEvent,
} from "../workflows/upsert-products-batch/async"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
} from "../workflows/upsert-products-batch/types"

// Medusa's locking module expects timeout values in seconds.
const LOCK_ACQUIRE_TIMEOUT_SECONDS = 60 * 60

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildJobFinishedWebhookPayload = (
  job: SymmyImportJobDTO
): SymmyWebhookJobPayload => ({
  event:
    job.status === "failed"
      ? "symmy.import_job.failed"
      : "symmy.import_job.completed",
  job: {
    id: job.id,
    type: job.type,
    status: job.status,
    total: job.total,
    processed: job.processed,
    failed: job.failed,
    attempts: job.attempts,
    result: job.result,
    error: job.error,
    created_at: job.created_at,
    updated_at: job.updated_at,
    started_at: job.started_at,
    finished_at: job.finished_at,
  },
})

const deliverJobFinishedWebhook = async (
  webhookConfigService: SymmyWebhookConfigModuleService,
  logger: Logger,
  job: SymmyImportJobDTO
) => {
  try {
    await webhookConfigService.deliverJobFinished(
      buildJobFinishedWebhookPayload(job)
    )
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to dispatch webhook for job ${job.id}: ${message}`
    )
  }
}

const failJobAfterLockError = async ({
  error,
  importJobService,
  jobId,
  logger,
  webhookConfigService,
}: {
  error: unknown
  importJobService: SymmyImportJobModuleService
  jobId: string
  logger: Logger
  webhookConfigService: SymmyWebhookConfigModuleService
}) => {
  const message = toErrorMessage(error)
  logger.error(
    `[symmy-plugin] Product upsert job ${jobId} failed before lock-protected processing completed: ${message}`,
    error instanceof Error ? error : new Error(message)
  )

  try {
    const currentJob = await importJobService.retrieveJob(jobId)
    if (
      currentJob.status === "completed" ||
      currentJob.status === "failed" ||
      currentJob.status === "running"
    ) {
      return
    }

    const failedJob = await importJobService.markFailed(jobId, message)
    await deliverJobFinishedWebhook(webhookConfigService, logger, failedJob)
  } catch (failureUpdateError) {
    const failureUpdateMessage = toErrorMessage(failureUpdateError)
    logger.error(
      `[symmy-plugin] Failed to mark product upsert job ${jobId} as failed after lock error: ${failureUpdateMessage}`,
      failureUpdateError instanceof Error
        ? failureUpdateError
        : new Error(failureUpdateMessage)
    )
  }
}

export default async function productsUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyProductsUpsertRequestedEvent>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const importJobService = container.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE
  )
  const webhookConfigService =
    container.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    await lockingModule.execute(
      `symmy-products-upsert:${data.job_id}`,
      async () => {
        const job = await importJobService.retrieveJob(data.job_id)
        if (job.status === "completed" || job.status === "failed") {
          return
        }

        if (job.status === "running") {
          logger.warn(
            `[symmy-plugin] Product upsert job ${job.id} was already running when the lock was acquired; retrying the job.`
          )
        }

        await importJobService.markRunning(job.id)

        try {
          const { result } = await upsertProductsBatchWorkflow(container).run({
            input: job.payload as UpsertProductsBatchInput,
          })
          const output = result as UpsertProductsBatchOutput

          const completedJob = await importJobService.markCompleted(job.id, {
            result: output as unknown as Record<string, unknown>,
            processed: output.processed,
            failed: output.failed,
          })
          await deliverJobFinishedWebhook(
            webhookConfigService,
            logger,
            completedJob
          )
        } catch (error) {
          const message = toErrorMessage(error)
          logger.error(
            `[symmy-plugin] Product upsert job ${job.id} failed: ${message}`,
            error instanceof Error ? error : new Error(message)
          )
          const failedJob = await importJobService.markFailed(job.id, message)
          await deliverJobFinishedWebhook(
            webhookConfigService,
            logger,
            failedJob
          )
        }
      },
      { timeout: LOCK_ACQUIRE_TIMEOUT_SECONDS }
    )
  } catch (error) {
    await failJobAfterLockError({
      error,
      importJobService,
      jobId: data.job_id,
      logger,
      webhookConfigService,
    })
  }
}

export const config: SubscriberConfig = {
  event: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
}
