import { formatCurrencyAmount } from "./price-format"

export {
  resolveOrderItemCount,
  resolveOrderItemQuantity,
  resolveOrderItemTotalAmount,
  resolveOrderTotalAmount,
} from "./order-item-format"
export { resolveOrderInvoiceUrl } from "./order-invoice-format"
export {
  resolveOrderFulfillmentStatusLabel,
  resolveOrderPaymentStatusLabel,
  resolveOrderProgressState,
} from "./order-status-format"
export type { OrderStatusTranslator } from "./order-status-format"

type OrderDateValue = Date | string | null | undefined

export const resolveOrderDisplayId = (order: {
  display_id?: number | null
  id: string
}) => ((order.display_id ?? 0) === 0 ? order.id : `#${order.display_id}`)

export const formatOrderDate = (value: OrderDateValue, locale: string) => {
  if (value === null || value === undefined || value === "") {
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
  currencyCode?: string | null,
) => formatCurrencyAmount(amount, currencyCode)
