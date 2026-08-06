import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"

interface BulkCancelOrdersWorkflowInput {
  order_ids: string[]
}

type CancelOrderWorkflowContainer = Parameters<typeof cancelOrderWorkflow>[0]

export const cancelOrdersWithCancelOrderWorkflow = async (
  input: BulkCancelOrdersWorkflowInput,
  container: CancelOrderWorkflowContainer,
) => {
  const cancelOrderAtIndex = async (index: number): Promise<void> => {
    const orderId = input.order_ids[index]
    if (orderId === undefined) {
      return
    }

    await cancelOrderWorkflow(container).run({
      input: {
        order_id: orderId,
      },
    })
    await cancelOrderAtIndex(index + 1)
  }

  await cancelOrderAtIndex(0)

  return {
    order_ids: input.order_ids,
  }
}

const cancelOrdersWithCancelOrderWorkflowStep = createStep(
  "cancel-orders-with-cancel-order-workflow",
  async (input: BulkCancelOrdersWorkflowInput, { container }) =>
    new StepResponse(
      await cancelOrdersWithCancelOrderWorkflow(input, container),
    ),
)

export const bulkCancelOrdersWorkflow = createWorkflow(
  "bulk-cancel-orders",
  (input: BulkCancelOrdersWorkflowInput) => {
    const canceledOrders = cancelOrdersWithCancelOrderWorkflowStep(input)

    return new WorkflowResponse({
      orders: canceledOrders,
    })
  },
)
