import { OrderWorkflowEvents } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep, updateOrdersStep } from "@medusajs/medusa/core-flows"
import type { OrderExpeditionTargetStatus } from "../../utils/order-expedition"

export const ORDER_EXPEDITION_DIRECT_UPDATE_STATUSES = [
  "pending",
  "draft",
  "requires_action",
] as const satisfies readonly OrderExpeditionTargetStatus[]

export type OrderExpeditionDirectUpdateStatus =
  (typeof ORDER_EXPEDITION_DIRECT_UPDATE_STATUSES)[number]

type BulkUpdateOrderStatusesWorkflowInput = {
  order_ids: string[]
  target_status: OrderExpeditionDirectUpdateStatus
}

export function isOrderExpeditionDirectUpdateStatus(
  status: OrderExpeditionTargetStatus
): status is OrderExpeditionDirectUpdateStatus {
  return ORDER_EXPEDITION_DIRECT_UPDATE_STATUSES.some(
    (directStatus) => directStatus === status
  )
}

export const bulkUpdateOrderStatusesWorkflow = createWorkflow(
  "bulk-update-order-statuses",
  (workflowInput: BulkUpdateOrderStatusesWorkflowInput) => {
    const update = transform(
      { workflowInput },
      ({ workflowInput: currentInput }) => ({
        is_draft_order: currentInput.target_status === "draft",
        status: currentInput.target_status,
      })
    )
    const updatedOrders = updateOrdersStep({
      selector: {
        id: workflowInput.order_ids,
      },
      update,
    })
    const eventData = transform(
      { workflowInput },
      ({ workflowInput: currentInput }) =>
        currentInput.order_ids.map((id) => ({ id }))
    )

    emitEventStep({
      data: eventData,
      eventName: OrderWorkflowEvents.UPDATED,
    })

    return new WorkflowResponse({
      orders: updatedOrders,
    })
  }
)
