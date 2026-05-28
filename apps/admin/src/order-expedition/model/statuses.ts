import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import type {
  ManualOrderBusinessStatusId,
  OrderBusinessStatus,
  OrderBusinessStatusId,
  OrderBusinessStatusTone,
  OrderExpeditionBlockingOrder,
  OrderExpeditionOrder,
} from "../../admin-types"

export const ORDER_BUSINESS_STATUS_IDS = [
  "new",
  "awaiting_payment",
  "paid",
  "processing",
  "waiting_for_supplier",
  "shipped",
  "delivered",
  "canceled",
] as const satisfies readonly OrderBusinessStatusId[]

export const MANUAL_ORDER_BUSINESS_STATUS_IDS = [
  "processing",
  "waiting_for_supplier",
  "canceled",
] as const satisfies readonly ManualOrderBusinessStatusId[]

export const BUSINESS_STATUS_LABELS: Record<OrderBusinessStatusId, string> = {
  awaiting_payment: "Ceka na platbu",
  canceled: "Storno",
  delivered: "Doruceno",
  new: "Nova",
  paid: "Zaplaceno",
  processing: "Zpracovava se",
  shipped: "Odeslano",
  waiting_for_supplier: "Ceka na dodavatele",
}

export const BUSINESS_STATUS_BADGE_VARIANTS: Record<
  OrderBusinessStatusTone,
  "danger" | "info" | "outline" | "success" | "warning"
> = {
  blue: "info",
  green: "success",
  grey: "outline",
  orange: "warning",
  purple: "info",
  red: "danger",
}

export type ManualStatusValue = ManualOrderBusinessStatusId | "clear"

export const MANUAL_STATUS_ITEMS: Array<
  SelectItem & { value: ManualStatusValue }
> = [
  ...MANUAL_ORDER_BUSINESS_STATUS_IDS.map((value) => ({
    displayValue: BUSINESS_STATUS_LABELS[value],
    label: BUSINESS_STATUS_LABELS[value],
    value,
  })),
  {
    displayValue: "Vymazat manualni status",
    label: "Vymazat manualni status",
    value: "clear",
  },
]

export function isManualOrderBusinessStatusId(
  value: unknown
): value is ManualOrderBusinessStatusId {
  return MANUAL_ORDER_BUSINESS_STATUS_IDS.some((status) => status === value)
}

export function isOrderBusinessStatusId(
  value: unknown
): value is OrderBusinessStatusId {
  return ORDER_BUSINESS_STATUS_IDS.some((status) => status === value)
}

export function getManualStatusLabel(
  status: ManualOrderBusinessStatusId | null
) {
  return status === null
    ? "Vymazat manualni status"
    : BUSINESS_STATUS_LABELS[status]
}

export function getBusinessStatus(
  order: OrderExpeditionOrder
): OrderBusinessStatus {
  return order.business_status
}

export function getBusinessStatusBulkBlockReason(
  order: OrderExpeditionOrder,
  status: ManualOrderBusinessStatusId | null
) {
  const currentManualStatus = order.manual_status ?? null

  if (currentManualStatus === status) {
    return status === null
      ? "Manual status is already clear"
      : `Manual status is already ${getManualStatusLabel(status)}`
  }

  if (status === null || status === "canceled") {
    return
  }

  const businessStatus = getBusinessStatus(order)

  if (order.status === "canceled") {
    return "Canceled orders stay canceled"
  }

  if (businessStatus.id === "delivered" || businessStatus.id === "shipped") {
    return `${BUSINESS_STATUS_LABELS[businessStatus.id]} status has higher priority`
  }

  return
}

export function getBulkBusinessStatusPreview(
  orders: OrderExpeditionOrder[],
  status: ManualOrderBusinessStatusId | null
) {
  const skipped: OrderExpeditionBlockingOrder[] = []
  const updatable: OrderExpeditionOrder[] = []

  for (const order of orders) {
    const reason = getBusinessStatusBulkBlockReason(order, status)

    if (reason) {
      skipped.push({
        id: order.id,
        order_display_id: order.order_display_id,
        reason,
      })
      continue
    }

    updatable.push(order)
  }

  return { skipped, updatable }
}

export function getBulkBusinessStatusTarget(value: ManualStatusValue | "") {
  if (value === "") {
    return
  }

  return value === "clear" ? null : value
}
