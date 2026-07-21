import { formatCurrencyAmount } from "./price-format"

type OrderStatusBadgeVariant = "danger" | "info" | "success" | "warning"
export type OrderStatusGroup = "fulfillment" | "lifecycle" | "payment"
export type OrderStatusTranslator = (
  group: OrderStatusGroup,
  status: string
) => string

export type StorefrontOrderStatusInput = {
  fulfillment_status?: string | null
  payment_status?: string | null
  status?: string | null
}

export const resolveOrderPaymentStatusLabel = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator
) => {
  if (!order.payment_status) {
    return null
  }

  return translateStatus("payment", order.payment_status)
}

export const resolveOrderFulfillmentStatusLabel = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator
) => {
  if (!order.fulfillment_status) {
    return null
  }

  return translateStatus("fulfillment", order.fulfillment_status)
}

export const resolveOrderProgressState = (
  order: StorefrontOrderStatusInput,
  translateStatus: OrderStatusTranslator
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

  if (order.fulfillment_status === "delivered") {
    return {
      label: translateStatus("fulfillment", "delivered"),
      variant: "success",
    }
  }

  if (order.fulfillment_status === "partially_delivered") {
    return {
      label: translateStatus("fulfillment", "partially_delivered"),
      variant: "info",
    }
  }

  if (order.fulfillment_status === "shipped") {
    return {
      label: translateStatus("fulfillment", "shipped"),
      variant: "info",
    }
  }

  if (order.fulfillment_status === "partially_shipped") {
    return {
      label: translateStatus("fulfillment", "partially_shipped"),
      variant: "info",
    }
  }

  if (order.fulfillment_status === "fulfilled") {
    return {
      label: translateStatus("fulfillment", "fulfilled"),
      variant: "info",
    }
  }

  if (order.fulfillment_status === "partially_fulfilled") {
    return {
      label: translateStatus("fulfillment", "partially_fulfilled"),
      variant: "info",
    }
  }

  if (order.fulfillment_status === "canceled") {
    return {
      label: translateStatus("fulfillment", "canceled"),
      variant: "danger",
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
    return {
      label: translateStatus("lifecycle", "archived"),
      variant: "info",
    }
  }

  return {
    label: translateStatus("lifecycle", order.status ?? "pending"),
    variant: "info",
  }
}

export const resolveOrderDisplayId = (order: {
  display_id?: number | null
  id: string
}) => {
  if (order.display_id) {
    return `#${order.display_id}`
  }

  return order.id
}

export const formatOrderDate = (
  value: Date | string | null | undefined,
  locale: string
) => {
  if (!value) {
    return "-"
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

export const formatOrderAmount = (
  amount: number,
  currencyCode?: string | null
) => formatCurrencyAmount(amount, currencyCode)

export const resolveOrderTotalAmount = (order: {
  item_total?: number | null
  total?: number | null
}) => {
  if (typeof order.total === "number") {
    return order.total
  }

  if (typeof order.item_total === "number") {
    return order.item_total
  }

  return 0
}

export const resolveOrderItemTotalAmount = (item: {
  quantity?: number | null
  total?: number | null
  unit_price?: number | null
}) => {
  if (typeof item.total === "number") {
    return item.total
  }

  const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0
  const quantity = typeof item.quantity === "number" ? item.quantity : 1

  return unitPrice * quantity
}

export const resolveOrderItemQuantity = (item: {
  quantity?: number | null
}) => {
  if (typeof item.quantity === "number" && item.quantity > 0) {
    return item.quantity
  }

  return 0
}

export const resolveOrderItemCount = (
  items?: Array<{ quantity?: number | null }> | null
) => {
  if (!items?.length) {
    return 0
  }

  return items.reduce((count, item) => {
    const quantity = resolveOrderItemQuantity(item)
    return count + quantity
  }, 0)
}

const resolveRecordValue = (
  source: Record<string, unknown>,
  key: string
): string | null => {
  const value = source[key]
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const resolveOrderInvoiceUrl = (
  order: { metadata?: unknown } | null | undefined
) => {
  if (!(order?.metadata && typeof order.metadata === "object")) {
    return null
  }

  const metadata = order.metadata as Record<string, unknown>

  return (
    resolveRecordValue(metadata, "invoice_url") ??
    resolveRecordValue(metadata, "invoiceUrl") ??
    resolveRecordValue(metadata, "invoice_href") ??
    resolveRecordValue(metadata, "invoiceHref")
  )
}
