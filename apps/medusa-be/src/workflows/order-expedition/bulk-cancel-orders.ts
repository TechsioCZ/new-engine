import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { cancelOrdersStep } from "@medusajs/medusa/core-flows"

type BulkCancelOrdersWorkflowInput = {
  order_ids: string[]
}

export const bulkCancelOrdersWorkflow = createWorkflow(
  "bulk-cancel-orders",
  (input: BulkCancelOrdersWorkflowInput) => {
    const canceledOrders = cancelOrdersStep({ orderIds: input.order_ids })

    return new WorkflowResponse({
      orders: canceledOrders,
    })
  }
)
