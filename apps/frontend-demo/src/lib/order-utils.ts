import type { OrderStatus } from "@/types/order"

const orderStatusMap: Record<OrderStatus, string> = {
  archived: "Archivováno",
  canceled: "Zrušeno",
  completed: "Dokončeno",
  pending: "Čeká na zpracování",
  requires_action: "Vyžaduje akci",
}

const isOrderStatus = (status: string): status is OrderStatus =>
  Object.hasOwn(orderStatusMap, status)

export const getOrderStatusLabel = (status: string): string =>
  isOrderStatus(status) ? orderStatusMap[status] : status

export const truncateProductTitle = (title: string, maxWords = 3): string => {
  const words = title.split(" ")
  if (words.length <= maxWords) {
    return title
  }
  return words.slice(0, maxWords).join(" ")
}

export const formatOrderDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("cs-CZ", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return "Neznámé datum"
  }
}

export const ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "created_at",
  "total",
  "currency_code",
  "items",
  "summary",
  "payment_status",
  "fulfillment_status",
  "shipping_methods",
  "email",
  "updated_at",
  "item_subtotal",
  "item_tax_total",
  "shipping_total",
] as const
