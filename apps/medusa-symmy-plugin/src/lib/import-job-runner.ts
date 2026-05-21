import type {
  ILockingModule,
  Logger,
  MedusaContainer,
} from "@medusajs/framework/types"
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

// Medusa's locking module expects timeout values in seconds.
const LOCK_ACQUIRE_TIMEOUT_SECONDS = 60 * 60

type CompletionStats = {
  processed: number
  failed: number
}

type RunImportJobInput<TInput, TOutput extends Record<string, unknown>> = {
  container: MedusaContainer
  jobId: string
  jobLabel: string
  lockKey: string
  run: (input: TInput) => Promise<TOutput>
  getCompletionStats: (output: TOutput) => CompletionStats
}

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "object" && error && "message" in error) {
    return String(error.message)
  }
  if (typeof error === "string") {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return "Unknown error"
  }
}

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
  jobLabel,
  logger,
  webhookConfigService,
}: {
  error: unknown
  importJobService: SymmyImportJobModuleService
  jobId: string
  jobLabel: string
  logger: Logger
  webhookConfigService: SymmyWebhookConfigModuleService
}) => {
  const message = toErrorMessage(error)
  logger.error(
    `[symmy-plugin] ${jobLabel} job ${jobId} failed before lock-protected processing completed: ${message}`,
    error instanceof Error ? error : new Error(message)
  )

  try {
    const currentJob = await importJobService.retrieveJob(jobId)
    if (currentJob.status === "completed" || currentJob.status === "failed") {
      return
    }

    const failedJob = await importJobService.markFailed(jobId, message)
    await deliverJobFinishedWebhook(webhookConfigService, logger, failedJob)
  } catch (failureUpdateError) {
    const failureUpdateMessage = toErrorMessage(failureUpdateError)
    logger.error(
      `[symmy-plugin] Failed to mark ${jobLabel} job ${jobId} as failed after lock error: ${failureUpdateMessage}`,
      failureUpdateError instanceof Error
        ? failureUpdateError
        : new Error(failureUpdateMessage)
    )
  }
}

export const runImportJob = async <
  TInput,
  TOutput extends Record<string, unknown>,
>({
  container,
  getCompletionStats,
  jobId,
  jobLabel,
  lockKey,
  run,
}: RunImportJobInput<TInput, TOutput>) => {
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
      lockKey,
      async () => {
        const job = await importJobService.retrieveJob(jobId)
        if (job.status === "completed" || job.status === "failed") {
          return
        }

        if (job.status === "running") {
          logger.warn(
            `[symmy-plugin] ${jobLabel} job ${job.id} was already running when the lock was acquired; retrying the job.`
          )
        }

        await importJobService.markRunning(job.id)

        try {
          const output = await run(job.payload as TInput)
          const stats = getCompletionStats(output)

          const completedJob = await importJobService.markCompleted(job.id, {
            result: output,
            processed: stats.processed,
            failed: stats.failed,
          })
          await deliverJobFinishedWebhook(
            webhookConfigService,
            logger,
            completedJob
          )
        } catch (error) {
          const message = toErrorMessage(error)
          logger.error(
            `[symmy-plugin] ${jobLabel} job ${job.id} failed: ${message}`,
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
      jobId,
      jobLabel,
      logger,
      webhookConfigService,
    })
  }
}
