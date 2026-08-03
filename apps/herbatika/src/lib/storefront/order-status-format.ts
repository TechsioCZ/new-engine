const ORDER_PAYMENT_STATUS_LABELS: Record<string, string> = {
  authorized: "Platba overená",
  awaiting: "Čaká na platbu",
  canceled: "Platba zrušená",
  captured: "Zaplatená",
  not_paid: "Čaká na platbu",
  partially_authorized: "Čiastočne overená",
  partially_captured: "Čiastočne zaplatená",
  partially_refunded: "Čiastočne vrátená",
  refunded: "Vrátená",
  requires_action: "Platba vyžaduje akciu",
}

const ORDER_FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  canceled: "Doručenie zrušené",
  delivered: "Doručená",
  fulfilled: "Pripravená na odoslanie",
  not_fulfilled: "Spracováva sa",
  partially_delivered: "Čiastočne doručená",
  partially_fulfilled: "Čiastočne pripravená",
  partially_shipped: "Čiastočne odoslaná",
  shipped: "Odoslaná",
}

type OrderStatusBadgeVariant = "danger" | "info" | "success" | "warning"

export type StorefrontOrderStatusInput = {
  fulfillment_status?: string | null
  payment_status?: string | null
  status?: string | null
}

export const resolveOrderPaymentStatusLabel = (
  order: StorefrontOrderStatusInput
) =>
  order.payment_status
    ? (ORDER_PAYMENT_STATUS_LABELS[order.payment_status] ??
      order.payment_status)
    : null

export const resolveOrderFulfillmentStatusLabel = (
  order: StorefrontOrderStatusInput
) =>
  order.fulfillment_status
    ? (ORDER_FULFILLMENT_STATUS_LABELS[order.fulfillment_status] ??
      order.fulfillment_status)
    : null

export const resolveOrderProgressState = (
  order: StorefrontOrderStatusInput
): { label: string; variant: OrderStatusBadgeVariant } => {
  if (order.status === "canceled") {
    return { label: "Zrušená", variant: "danger" }
  }
  if (
    order.status === "requires_action" ||
    order.payment_status === "requires_action"
  ) {
    return { label: "Vyžaduje akciu", variant: "warning" }
  }

  const fulfillmentStates: Record<
    string,
    { label: string; variant: OrderStatusBadgeVariant }
  > = {
    delivered: { label: "Doručená", variant: "success" },
    partially_delivered: { label: "Čiastočne doručená", variant: "info" },
    shipped: { label: "Odoslaná", variant: "info" },
    partially_shipped: { label: "Čiastočne odoslaná", variant: "info" },
    fulfilled: { label: "Pripravená na odoslanie", variant: "info" },
    partially_fulfilled: { label: "Čiastočne pripravená", variant: "info" },
    canceled: { label: "Doručenie zrušené", variant: "danger" },
  }
  if (order.fulfillment_status) {
    const fulfillmentState = fulfillmentStates[order.fulfillment_status]
    if (fulfillmentState) {
      return fulfillmentState
    }
  }
  if (
    order.payment_status === "awaiting" ||
    order.payment_status === "not_paid"
  ) {
    return { label: "Čaká na platbu", variant: "warning" }
  }
  if (order.status === "completed") {
    return { label: "Dokončená", variant: "success" }
  }
  if (order.status === "archived") {
    return { label: "Uzavretá", variant: "info" }
  }
  return { label: "Spracováva sa", variant: "info" }
}
