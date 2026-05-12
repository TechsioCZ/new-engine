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

type CancelOrderWorkflowContainer = Parameters<typeof cancelOrderWorkflow>[0]

export async function cancelOrdersWithCancelOrderWorkflow(
  input: BulkCancelOrdersWorkflowInput,
  container: CancelOrderWorkflowContainer
) {
  for (const orderId of input.order_ids) {
    await cancelOrderWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    })
  }

  return {
    order_ids: input.order_ids,
  }
}

const cancelOrdersWithCancelOrderWorkflowStep = createStep(
  "cancel-orders-with-cancel-order-workflow",
  async (input: BulkCancelOrdersWorkflowInput, { container }) =>
    new StepResponse(
      await cancelOrdersWithCancelOrderWorkflow(input, container)
    )
)

export const bulkCancelOrdersWorkflow = createWorkflow(
  "bulk-cancel-orders",
  (input: BulkCancelOrdersWorkflowInput) => {
    const canceledOrders = cancelOrdersWithCancelOrderWorkflowStep(input)

    return new WorkflowResponse({
      orders: canceledOrders,
    })
  }
)
