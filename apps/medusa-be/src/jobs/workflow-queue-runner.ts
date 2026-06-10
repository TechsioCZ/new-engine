import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { WORKFLOW_QUEUE_MODULE } from "../modules/workflow-queue"
import type WorkflowQueueModuleService from "../modules/workflow-queue/service"
import { getQueuedWorkflowRunner } from "../utils/workflow-queue-registry"

const JOB_LOCK_KEY = "workflow-queue-runner-job"
const JOB_LOCK_TIMEOUT = 60
const DEFAULT_WORKFLOW_QUEUE_RUNNER_SCHEDULE = "0 * * * *"

type WorkflowQueueItemDTO = {
  id: string
  arguments: Record<string, unknown> | null
  run_at: Date | string
  workflow: string
}

type WorkflowQueueService = WorkflowQueueModuleService & {
  listWorkflowQueueItems: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<WorkflowQueueItemDTO[]>
}

function withQueueItemId(
  item: WorkflowQueueItemDTO
): Record<string, unknown> {
  return {
    ...(item.arguments ?? {}),
    queue_item_id: item.id,
  }
}

async function executeWorkflowQueueRunner(
  container: MedusaContainer,
  logger: Logger
) {
  const workflowQueueService = container.resolve<WorkflowQueueService>(
    WORKFLOW_QUEUE_MODULE
  )
  const now = new Date()

  logger.info("Workflow Queue Runner: Starting...")

  const dueItems = await workflowQueueService.listWorkflowQueueItems(
    {
      run_at: { $lte: now },
    },
    {
      order: { run_at: "ASC" },
    }
  )

  if (!dueItems.length) {
    logger.info("Workflow Queue Runner: No due items found")
    return
  }

  logger.info(`Workflow Queue Runner: Found ${dueItems.length} due items`)

  let processedCount = 0
  for (const item of dueItems) {
    const runner = getQueuedWorkflowRunner(item.workflow)
    if (!runner) {
      logger.error(
        `Workflow Queue Runner: Unknown workflow ${item.workflow} for queue item ${item.id}`
      )
      continue
    }

    try {
      await runner(container, withQueueItemId(item))
      processedCount += 1
    } catch (error) {
      logger.error(
        `Workflow Queue Runner: Failed queue item ${item.id} (${item.workflow})`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  logger.info(
    `Workflow Queue Runner: Completed, processed ${processedCount}/${dueItems.length} due items`
  )
}

export default async function workflowQueueRunnerJob(container: MedusaContainer) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  try {
    await lockingModule.execute(
      JOB_LOCK_KEY,
      async () => {
        await executeWorkflowQueueRunner(container, logger)
      },
      { timeout: JOB_LOCK_TIMEOUT }
    )
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Timed-out acquiring lock")
    ) {
      logger.info(
        "Workflow Queue Runner: Skipping - another instance is already running"
      )
      return
    }

    throw error
  }
}

export const config = {
  name: "workflow-queue-runner",
  schedule:
    process.env.WORKFLOW_QUEUE_RUNNER_SCHEDULE ??
    DEFAULT_WORKFLOW_QUEUE_RUNNER_SCHEDULE,
}
