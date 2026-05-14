import type {
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
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
import {
  SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
  type SymmyProductsUpsertRequestedEvent,
} from "../workflows/upsert-products-batch/async"
import { upsertProductsBatchWorkflow } from "../workflows/upsert-products-batch"
import type {
  UpsertProductsBatchInput,
  UpsertProductsBatchOutput,
} from "../workflows/upsert-products-batch/types"

const LOCK_TIMEOUT_SECONDS = 60 * 60

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Unknown error"

const buildJobCompletedWebhookPayload = (
  job: SymmyImportJobDTO
): SymmyWebhookJobPayload => ({
  event: "symmy.import_job.completed",
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

export default async function productsUpsertRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<SymmyProductsUpsertRequestedEvent>) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const importJobService =
    container.resolve<SymmyImportJobModuleService>(SYMMY_IMPORT_JOB_MODULE)
  const webhookConfigService =
    container.resolve<SymmyWebhookConfigModuleService>(
      SYMMY_WEBHOOK_CONFIG_MODULE
    )
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  await lockingModule.execute(
    `symmy-products-upsert:${data.job_id}`,
    async () => {
      const job = await importJobService.retrieveJob(data.job_id)
      if (job.status === "completed" || job.status === "running") {
        return
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
        await webhookConfigService.deliverJobCompleted(
          buildJobCompletedWebhookPayload(completedJob)
        )
      } catch (error) {
        const message = toErrorMessage(error)
        logger.error(
          `[symmy-plugin] Product upsert job ${job.id} failed: ${message}`,
          error instanceof Error ? error : new Error(message)
        )
        await importJobService.markFailed(job.id, message)
      }
    },
    { timeout: LOCK_TIMEOUT_SECONDS }
  )
}

export const config: SubscriberConfig = {
  event: SYMMY_PRODUCTS_UPSERT_REQUESTED_EVENT,
}
