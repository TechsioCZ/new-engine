import { getCarrierLabel } from "./format"
import {
  ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS,
  type OrderDashboardBlockingOrder,
  type OrderDashboardOrder,
  type OrderDashboardPacketaEligibilityOrder,
} from "./types"

type TranslationFunction = (
  key: string,
  options?: Record<string, unknown>
) => string

type PacketaLabelPreparation =
  | {
      blockingOrders: OrderDashboardBlockingOrder[]
      kind: "ready"
      orderIds: string[]
    }
  | {
      blockingOrders: OrderDashboardBlockingOrder[]
      kind: "no-printable"
    }
  | {
      blockingOrders: OrderDashboardBlockingOrder[]
      kind: "too-many"
      limit: number
    }

export function getPacketaCarrierOrderIds(orders: OrderDashboardOrder[]) {
  return orders
    .filter((order) => order.carrier.value === "packeta")
    .map((order) => order.id)
}

export function preparePacketaLabelDownload(
  selectedOrders: OrderDashboardOrder[],
  eligibilityOrders: OrderDashboardPacketaEligibilityOrder[] | undefined,
  t: TranslationFunction
): PacketaLabelPreparation {
  const preview = getPacketaLabelPreview(selectedOrders, eligibilityOrders, t)
  const blockingOrders = preview.skipped

  if (!preview.printableOrders.length) {
    return { blockingOrders, kind: "no-printable" }
  }

  if (preview.printableOrders.length > ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS) {
    return {
      blockingOrders,
      kind: "too-many",
      limit: ORDER_DASHBOARD_MAX_PACKETA_LABEL_IDS,
    }
  }

  return {
    blockingOrders,
    kind: "ready",
    orderIds: preview.printableOrders.map((order) => order.id),
  }
}

export function getPacketaLabelPreview(
  selectedOrders: OrderDashboardOrder[],
  eligibilityOrders: OrderDashboardPacketaEligibilityOrder[] | undefined,
  t: TranslationFunction
) {
  const eligibilityOrdersById = new Map(
    (eligibilityOrders ?? []).map((order) => [order.id, order])
  )
  const printableOrders: OrderDashboardOrder[] = []
  const skipped: OrderDashboardBlockingOrder[] = []

  for (const order of selectedOrders) {
    const eligibilityOrder = eligibilityOrdersById.get(order.id)
    const skipReason = getPacketaLabelSkipReason(order, eligibilityOrder, t)

    if (skipReason) {
      skipped.push({
        id: order.id,
        order_display_id: order.order_display_id,
        reason: skipReason,
      })
      continue
    }

    printableOrders.push(order)
  }

  return { printableOrders, skipped }
}

function getPacketaLabelSkipReason(
  order: OrderDashboardOrder,
  eligibilityOrder: OrderDashboardPacketaEligibilityOrder | undefined,
  t: TranslationFunction
) {
  if (order.carrier.value !== "packeta") {
    return t("packetaSkip.notPacketa", { carrier: getCarrierLabel(order) })
  }

  if (!eligibilityOrder) {
    return t("packetaSkip.unchecked")
  }

  if (!hasPrintablePacketaLabel(eligibilityOrder)) {
    return t("packetaSkip.noActiveLabel")
  }

  return
}

function hasPrintablePacketaLabel(
  order: OrderDashboardPacketaEligibilityOrder
) {
  return (order.fulfillments ?? []).some(
    (fulfillment) =>
      fulfillment.provider_id === "packeta_packeta" &&
      !fulfillment.canceled_at &&
      typeof fulfillment.data?.packet_id === "number"
  )
}
