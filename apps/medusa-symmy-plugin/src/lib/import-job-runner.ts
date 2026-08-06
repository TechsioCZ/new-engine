import type {
  ILockingModule,
  Logger,
  MedusaContainer,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { SYMMY_IMPORT_JOB_MODULE } from "../modules/import-job"
import type {
  SymmyImportJobDTO,
  SymmyImportJobModuleService,
} from "../modules/import-job"
import { SYMMY_WEBHOOK_CONFIG_MODULE } from "../modules/webhook-config"
import type {
  SymmyWebhookConfigModuleService,
  SymmyWebhookJobPayload,
} from "../modules/webhook-config"

// Medusa's locking module expects timeout values in seconds.
const LOCK_ACQUIRE_TIMEOUT_SECONDS = 60 * 60

interface CompletionStats {
  processed: number
  failed: number
}

interface RunImportJobInput<TInput, TOutput extends object> {
  container: MedusaContainer
  jobId: string
  jobLabel: string
  lockKey: string
  decodeInput: (value: unknown) => value is TInput
  run: (input: TInput) => Promise<TOutput>
  getCompletionStats: (output: TOutput) => CompletionStats
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

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
  job: SymmyImportJobDTO,
): SymmyWebhookJobPayload => ({
  event:
    job.status === "failed"
      ? "symmy.import_job.failed"
      : "symmy.import_job.completed",
  job: {
    attempts: job.attempts,
    created_at: job.created_at,
    error: job.error,
    failed: job.failed,
    finished_at: job.finished_at,
    id: job.id,
    processed: job.processed,
    result: job.result,
    started_at: job.started_at,
    status: job.status,
    total: job.total,
    type: job.type,
    updated_at: job.updated_at,
  },
})

const deliverJobFinishedWebhook = async (
  webhookConfigService: SymmyWebhookConfigModuleService,
  logger: Logger,
  job: SymmyImportJobDTO,
) => {
  try {
    await webhookConfigService.deliverJobFinished(
      buildJobFinishedWebhookPayload(job),
    )
  } catch (error) {
    const message = toErrorMessage(error)
    logger.warn(
      `[symmy-plugin] Failed to dispatch webhook for job ${job.id}: ${message}`,
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
    error instanceof Error ? error : new Error(message),
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
        : new Error(failureUpdateMessage),
    )
  }
}

export const runImportJob = async <TInput, TOutput extends object>({
  container,
  decodeInput,
  getCompletionStats,
  jobId,
  jobLabel,
  lockKey,
  run,
}: RunImportJobInput<TInput, TOutput>) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const importJobService = container.resolve<SymmyImportJobModuleService>(
    SYMMY_IMPORT_JOB_MODULE,
  )
  const webhookConfigService =
    container.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE,
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
            `[symmy-plugin] ${jobLabel} job ${job.id} was already running when the lock was acquired; retrying the job.`,
          )
        }

        await importJobService.markRunning(job.id)

        try {
          const input: unknown = job.payload
          if (!decodeInput(input)) {
            throw new Error("Import job payload failed validation")
          }
          const output = await run(input)
          const stats = getCompletionStats(output)
          const persistedOutput: unknown = output
          if (!isRecord(persistedOutput)) {
            throw new Error("Import job output is not a record")
          }

          const completedJob = await importJobService.markCompleted(job.id, {
            failed: stats.failed,
            processed: stats.processed,
            result: persistedOutput,
          })
          await deliverJobFinishedWebhook(
            webhookConfigService,
            logger,
            completedJob,
          )
        } catch (error) {
          const message = toErrorMessage(error)
          logger.error(
            `[symmy-plugin] ${jobLabel} job ${job.id} failed: ${message}`,
            error instanceof Error ? error : new Error(message),
          )
          const failedJob = await importJobService.markFailed(job.id, message)
          await deliverJobFinishedWebhook(
            webhookConfigService,
            logger,
            failedJob,
          )
        }
      },
      { timeout: LOCK_ACQUIRE_TIMEOUT_SECONDS },
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
