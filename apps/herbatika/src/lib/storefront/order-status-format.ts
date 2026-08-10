type OrderStatusBadgeVariant = "danger" | "info" | "success" | "warning"
type OrderStatusGroup = "fulfillment" | "lifecycle" | "payment"
export type OrderStatusTranslator = (
  group: OrderStatusGroup,
  status: string,
) => string

interface StorefrontOrderStatusInput {
  fulfillment_status?: string | null
  payment_status?: string | null
  status?: string | null
}

const translatePresentStatus = (
  group: Extract<OrderStatusGroup, "fulfillment" | "payment">,
  status: string | null | undefined,
  translateStatus: OrderStatusTranslator,
) =>
  typeof status === "string" && status.length > 0
    ? translateStatus(group, status)
    : null

export const resolveOrderPaymentStatusLabel = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator,
) => translatePresentStatus("payment", order.payment_status, translateStatus)

export const resolveOrderFulfillmentStatusLabel = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator,
) =>
  translatePresentStatus(
    "fulfillment",
    order.fulfillment_status,
    translateStatus,
  )

const FULFILLMENT_VARIANTS: Readonly<
  Partial<Record<string, OrderStatusBadgeVariant>>
> = {
  canceled: "danger",
  delivered: "success",
  fulfilled: "info",
  partially_delivered: "info",
  partially_fulfilled: "info",
  partially_shipped: "info",
  shipped: "info",
}

export const resolveOrderProgressState = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator,
): { label: string; variant: OrderStatusBadgeVariant } => {
  if (order.status === "canceled") {
    return {
      label: translateStatus("lifecycle", "canceled"),
      variant: "danger",
    }
  }
  if (
    order.status === "requires_action" ||
    order.payment_status === "requires_action"
  ) {
    return {
      label: translateStatus("lifecycle", "requires_action"),
      variant: "warning",
    }
  }

  const fulfillmentVariant =
    typeof order.fulfillment_status === "string"
      ? FULFILLMENT_VARIANTS[order.fulfillment_status]
      : undefined
  if (fulfillmentVariant) {
    return {
      label: translateStatus("fulfillment", order.fulfillment_status ?? ""),
      variant: fulfillmentVariant,
    }
  }
  if (
    order.payment_status === "awaiting" ||
    order.payment_status === "not_paid"
  ) {
    return {
      label: translateStatus("payment", order.payment_status),
      variant: "warning",
    }
  }
  if (order.status === "completed") {
    return {
      label: translateStatus("lifecycle", "completed"),
      variant: "success",
    }
  }
  if (order.status === "archived") {
    return { label: translateStatus("lifecycle", "archived"), variant: "info" }
  }
  return {
    label: translateStatus("lifecycle", order.status ?? "pending"),
    variant: "info",
  }
}
