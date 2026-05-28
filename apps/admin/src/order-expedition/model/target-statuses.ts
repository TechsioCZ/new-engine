import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import type {
  OrderExpeditionBlockingOrder,
  OrderExpeditionOrder,
  OrderExpeditionTargetStatus,
} from "../../admin-types"

export const ORDER_EXPEDITION_TARGET_STATUSES = [
  "pending",
  "completed",
  "draft",
  "archived",
  "canceled",
  "requires_action",
] as const satisfies readonly OrderExpeditionTargetStatus[]

const ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS = {
  archived: [],
  canceled: ["archived"],
  completed: ["archived"],
  draft: ["pending", "requires_action", "completed", "canceled", "archived"],
  pending: ["draft", "requires_action", "completed", "canceled"],
  requires_action: ["draft", "pending", "completed", "canceled"],
} as const satisfies Record<
  OrderExpeditionTargetStatus,
  readonly OrderExpeditionTargetStatus[]
>

export const MEDUSA_STATUS_LABELS: Record<OrderExpeditionTargetStatus, string> =
  {
    archived: "Archived",
    canceled: "Canceled",
    completed: "Completed",
    draft: "Draft",
    pending: "Pending",
    requires_action: "Requires action",
  }

export type TargetStatusOption = SelectItem & {
  blockedOrders: OrderExpeditionBlockingOrder[]
  value: OrderExpeditionTargetStatus
}

export function isOrderExpeditionTargetStatus(
  value: unknown
): value is OrderExpeditionTargetStatus {
  return ORDER_EXPEDITION_TARGET_STATUSES.some((status) => status === value)
}

function isOrderExpeditionTransitionSourceStatus(
  value: string
): value is OrderExpeditionTargetStatus {
  return isOrderExpeditionTargetStatus(value)
}

function formatStatusForReason(status: string) {
  return status.replace(/_/g, " ")
}

function formatStatusSubject(status: string) {
  const formatted = formatStatusForReason(status)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

function hasOrderExpeditionActiveFulfillment(order: OrderExpeditionOrder) {
  return Boolean(order.has_active_fulfillment)
}

export function getOrderExpeditionTransitionBlockReason(
  order: OrderExpeditionOrder,
  targetStatus: OrderExpeditionTargetStatus
) {
  const currentStatus = order.status

  if (!currentStatus) {
    return "Order status is unknown"
  }

  if (currentStatus === targetStatus) {
    return `Order is already ${formatStatusForReason(targetStatus)}`
  }

  if (!isOrderExpeditionTransitionSourceStatus(currentStatus)) {
    return `Order status ${formatStatusForReason(currentStatus)} cannot be changed`
  }

  if (currentStatus === "archived") {
    return "Archived orders cannot be changed"
  }

  if (currentStatus === "canceled" && targetStatus !== "archived") {
    return "Canceled orders can only be archived"
  }

  if (currentStatus === "completed" && targetStatus === "canceled") {
    return "Completed orders cannot be canceled"
  }

  if (currentStatus === "completed" && targetStatus !== "archived") {
    return "Completed orders can only be archived"
  }

  if (
    targetStatus === "canceled" &&
    hasOrderExpeditionActiveFulfillment(order)
  ) {
    return "Orders with active fulfillments cannot be canceled"
  }

  const allowedTargetStatuses: readonly OrderExpeditionTargetStatus[] =
    ORDER_EXPEDITION_ALLOWED_STATUS_TRANSITIONS[currentStatus]

  if (!allowedTargetStatuses.includes(targetStatus)) {
    return `${formatStatusSubject(currentStatus)} orders cannot be changed to ${formatStatusForReason(targetStatus)}`
  }

  return
}

export function getTargetStatusOptions(
  selectedOrders: OrderExpeditionOrder[]
): TargetStatusOption[] {
  return ORDER_EXPEDITION_TARGET_STATUSES.map((status) => {
    const blockedOrders = selectedOrders
      .map((order) => {
        const reason = getOrderExpeditionTransitionBlockReason(order, status)

        return reason
          ? {
              id: order.id,
              order_display_id: order.order_display_id,
              reason,
            }
          : null
      })
      .filter((order): order is OrderExpeditionBlockingOrder => Boolean(order))

    return {
      disabled: blockedOrders.length > 0,
      displayValue:
        blockedOrders.length > 0
          ? `${MEDUSA_STATUS_LABELS[status]} (${blockedOrders.length} blocked)`
          : MEDUSA_STATUS_LABELS[status],
      label:
        blockedOrders.length > 0
          ? `${MEDUSA_STATUS_LABELS[status]} (${blockedOrders.length} blocked)`
          : MEDUSA_STATUS_LABELS[status],
      blockedOrders,
      value: status,
    }
  })
}
