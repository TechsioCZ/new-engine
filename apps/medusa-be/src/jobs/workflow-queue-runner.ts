import type { MedusaContainer } from "@medusajs/framework"
import type { ILockingModule, Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { WORKFLOW_QUEUE_MODULE } from "../modules/workflow-queue"
import type WorkflowQueueModuleService from "../modules/workflow-queue/service"
import { executeWithLockTimeout } from "../utils/locking"
import { getQueuedWorkflowRunner } from "../utils/workflow-queue-registry"

const JOB_LOCK_KEY = "workflow-queue-runner-job"
const JOB_LOCK_TIMEOUT = 60
const DEFAULT_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE = 500
const MAX_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE = 5000
const DEFAULT_WORKFLOW_QUEUE_RUNNER_SCHEDULE = "0 * * * *"

interface WorkflowQueueItemDTO {
  id: string
  arguments: Record<string, unknown> | null
  run_at: Date | string
  workflow: string
}

type WorkflowQueueService = WorkflowQueueModuleService & {
  listWorkflowQueueItems: (
    filters?: Record<string, unknown>,
    config?: Record<string, unknown>,
  ) => Promise<WorkflowQueueItemDTO[]>
}

const getWorkflowQueueRunnerBatchSize = () => {
  const configuredBatchSize = Number(
    process.env["WORKFLOW_QUEUE_RUNNER_BATCH_SIZE"],
  )

  if (Number.isInteger(configuredBatchSize) && configuredBatchSize > 0) {
    return Math.min(configuredBatchSize, MAX_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE)
  }

  return DEFAULT_WORKFLOW_QUEUE_RUNNER_BATCH_SIZE
}

const withQueueItemId = (
  item: WorkflowQueueItemDTO,
): Record<string, unknown> => ({
  ...item.arguments,
  queue_item_id: item.id,
})

const processDueItems = async (
  dueItems: WorkflowQueueItemDTO[],
  index: number,
  container: MedusaContainer,
  logger: Logger,
): Promise<number> => {
  if (index >= dueItems.length) {
    return 0
  }

  const item = dueItems[index]
  if (item === undefined) {
    return 0
  }
  const runner = getQueuedWorkflowRunner(item.workflow)
  let processedCurrentItem = 0

  if (runner === undefined) {
    logger.error(
      `Workflow Queue Runner: Unknown workflow ${item.workflow} for queue item ${item.id}`,
    )
  } else {
    try {
      await runner(container, withQueueItemId(item))
      processedCurrentItem = 1
    } catch (error) {
      logger.error(
        `Workflow Queue Runner: Failed queue item ${item.id} (${item.workflow})`,
        error instanceof Error ? error : new Error(String(error)),
      )
    }
  }

  return (
    processedCurrentItem +
    (await processDueItems(dueItems, index + 1, container, logger))
  )
}

const executeWorkflowQueueRunner = async (
  container: MedusaContainer,
  logger: Logger,
) => {
  const workflowQueueService = container.resolve<WorkflowQueueService>(
    WORKFLOW_QUEUE_MODULE,
  )
  const now = new Date()
  const batchSize = getWorkflowQueueRunnerBatchSize()

  logger.info("Workflow Queue Runner: Starting...")

  const dueItems = await workflowQueueService.listWorkflowQueueItems(
    {
      run_at: { $lte: now },
    },
    {
      order: { run_at: "ASC" },
      take: batchSize,
    },
  )

  if (dueItems.length === 0) {
    logger.info("Workflow Queue Runner: No due items found")
    return
  }

  logger.info(`Workflow Queue Runner: Found ${dueItems.length} due items`)

  const processedCount = await processDueItems(dueItems, 0, container, logger)

  logger.info(
    `Workflow Queue Runner: Completed, processed ${processedCount}/${dueItems.length} due items`,
  )
}

const workflowQueueRunnerJob = async (container: MedusaContainer) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  const result = await executeWithLockTimeout(
    lockingModule,
    JOB_LOCK_KEY,
    JOB_LOCK_TIMEOUT,
    async () => {
      await executeWorkflowQueueRunner(container, logger)
    },
  )

  if (result.status === "timed_out") {
    logger.info(
      "Workflow Queue Runner: Skipping - another instance is already running",
    )
  }
}

export default workflowQueueRunnerJob

export const config = {
  name: "workflow-queue-runner",
  schedule:
    process.env["WORKFLOW_QUEUE_RUNNER_SCHEDULE"] ??
    DEFAULT_WORKFLOW_QUEUE_RUNNER_SCHEDULE,
}
