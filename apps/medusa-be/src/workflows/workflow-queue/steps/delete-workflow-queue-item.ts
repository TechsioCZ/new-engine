import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { WORKFLOW_QUEUE_MODULE } from "../../../modules/workflow-queue"
import type WorkflowQueueModuleService from "../../../modules/workflow-queue/service"

export type DeleteWorkflowQueueItemStepInput = {
  queue_item_id?: string
}

export const deleteWorkflowQueueItemStep = createStep(
  "delete-workflow-queue-item",
  async (input: DeleteWorkflowQueueItemStepInput, { container }) => {
    if (!input.queue_item_id) {
      return new StepResponse({ deleted: false })
    }

    const workflowQueueService = container.resolve<WorkflowQueueModuleService>(
      WORKFLOW_QUEUE_MODULE
    )

    await workflowQueueService.deleteWorkflowQueueItems([input.queue_item_id])

    return new StepResponse({ deleted: true })
  }
)
