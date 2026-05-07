import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"

type BulkCancelOrdersWorkflowInput = {
  order_ids: string[]
}

const bulkCancelOrdersStep = createStep(
  "bulk-cancel-orders-step",
  async ({ order_ids }: BulkCancelOrdersWorkflowInput, { container }) => {
    const canceledOrderIds: string[] = []

    for (const orderId of order_ids) {
      // Delegate to Medusa's cancel workflow so payment, reservation, event,
      // and hook side effects stay aligned with the native admin cancel action.
      await cancelOrderWorkflow(container).run({
        input: {
          order_id: orderId,
        },
      })
      canceledOrderIds.push(orderId)
    }

    return new StepResponse(canceledOrderIds)
  }
)

export const bulkCancelOrdersWorkflow = createWorkflow(
  "bulk-cancel-orders",
  (input: BulkCancelOrdersWorkflowInput) => {
    const canceledOrderIds = bulkCancelOrdersStep(input)

    return new WorkflowResponse({
      order_ids: canceledOrderIds,
    })
  }
)
