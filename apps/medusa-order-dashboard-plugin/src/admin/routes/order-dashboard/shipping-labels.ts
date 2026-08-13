import { getCarrierLabel } from "./format"
import {
  ORDER_DASHBOARD_MAX_LABEL_IDS,
  type OrderDashboardBlockingOrder,
  type OrderDashboardCarrierKey,
  type OrderDashboardLabelCarrier,
  type OrderDashboardLabelEligibilityOrder,
  type OrderDashboardOrder,
} from "./types"

type TranslationFunction = (
  key: string,
  options?: Record<string, unknown>
) => string

export type ShippingLabelCarrierSelection =
  | { kind: "none" }
  | { carriers: OrderDashboardCarrierKey[]; kind: "mixed" }
  | { carrier: OrderDashboardCarrierKey; kind: "unsupported" }
  | { carrier: OrderDashboardLabelCarrier; kind: "supported" }

export type ShippingLabelPreparation =
  | { blockingOrders: OrderDashboardBlockingOrder[]; kind: "no-printable" }
  | { carriers: OrderDashboardCarrierKey[]; kind: "mixed-carriers" }
  | { carrier: OrderDashboardCarrierKey; kind: "unsupported-carrier" }
  | {
      blockingOrders: OrderDashboardBlockingOrder[]
      kind: "too-many"
      limit: number
    }
  | {
      blockingOrders: OrderDashboardBlockingOrder[]
      carrier: OrderDashboardLabelCarrier
      kind: "ready"
      orderIds: string[]
    }

export function getShippingLabelCarrierSelection(
  orders: OrderDashboardOrder[],
  enabledCarriers: readonly OrderDashboardCarrierKey[]
): ShippingLabelCarrierSelection {
  const carriers = Array.from(
    new Set(orders.map((order) => order.carrier.value))
  )

  if (carriers.length === 0) {
    return { kind: "none" }
  }

  if (carriers.length > 1) {
    return { carriers, kind: "mixed" }
  }

  const carrier = carriers[0]

  if (
    carrier === "other" ||
    carrier === "ppl" ||
    !enabledCarriers.includes(carrier)
  ) {
    return { carrier, kind: "unsupported" }
  }

  return { carrier, kind: "supported" }
}

export function prepareShippingLabelDownload(
  selectedOrders: OrderDashboardOrder[],
  eligibilityOrders: OrderDashboardLabelEligibilityOrder[] | undefined,
  enabledCarriers: readonly OrderDashboardCarrierKey[],
  translate: TranslationFunction
): ShippingLabelPreparation {
  const carrierSelection = getShippingLabelCarrierSelection(
    selectedOrders,
    enabledCarriers
  )

  if (carrierSelection.kind === "mixed") {
    return { carriers: carrierSelection.carriers, kind: "mixed-carriers" }
  }

  if (carrierSelection.kind === "unsupported") {
    return { carrier: carrierSelection.carrier, kind: "unsupported-carrier" }
  }

  if (carrierSelection.kind === "none") {
    return { blockingOrders: [], kind: "no-printable" }
  }

  const preview = getShippingLabelPreview(
    selectedOrders,
    eligibilityOrders,
    carrierSelection.carrier,
    translate
  )

  if (!preview.printableOrders.length) {
    return { blockingOrders: preview.skipped, kind: "no-printable" }
  }

  if (preview.printableOrders.length > ORDER_DASHBOARD_MAX_LABEL_IDS) {
    return {
      blockingOrders: preview.skipped,
      kind: "too-many",
      limit: ORDER_DASHBOARD_MAX_LABEL_IDS,
    }
  }

  return {
    blockingOrders: preview.skipped,
    carrier: carrierSelection.carrier,
    kind: "ready",
    orderIds: preview.printableOrders.map((order) => order.id),
  }
}

export function getShippingLabelPreview(
  selectedOrders: OrderDashboardOrder[],
  eligibilityOrders: OrderDashboardLabelEligibilityOrder[] | undefined,
  carrier: OrderDashboardLabelCarrier,
  translate: TranslationFunction
) {
  const eligibilityOrdersById = new Map(
    (eligibilityOrders ?? []).map((order) => [order.id, order])
  )
  const printableOrders: OrderDashboardOrder[] = []
  const skipped: OrderDashboardBlockingOrder[] = []

  for (const order of selectedOrders) {
    const eligibilityOrder = eligibilityOrdersById.get(order.id)
    const skipReason = getShippingLabelSkipReason(
      order,
      eligibilityOrder,
      carrier,
      translate
    )

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

function getShippingLabelSkipReason(
  order: OrderDashboardOrder,
  eligibilityOrder: OrderDashboardLabelEligibilityOrder | undefined,
  carrier: OrderDashboardLabelCarrier,
  translate: TranslationFunction
) {
  if (order.carrier.value !== carrier) {
    return translate("shippingLabelSkip.mixedCarrier", {
      carrier: getCarrierLabel(order, translate),
    })
  }

  if (!eligibilityOrder) {
    return translate("shippingLabelSkip.unchecked")
  }

  if (!hasPrintableShippingLabel(eligibilityOrder, carrier)) {
    return translate("shippingLabelSkip.noActiveLabel", {
      carrier: translate(["carriers.", carrier].join("")),
    })
  }

  return
}

function hasPrintableShippingLabel(
  order: OrderDashboardLabelEligibilityOrder,
  carrier: OrderDashboardLabelCarrier
) {
  return (order.fulfillments ?? []).some((fulfillment) => {
    if (
      fulfillment.canceled_at ||
      fulfillment.provider_id !== [carrier, carrier].join("_")
    ) {
      return false
    }

    const data = fulfillment.data

    if (!data) {
      return false
    }

    switch (carrier) {
      case "gls":
        return isPrintableGLSData(data)
      case "packeta":
        return typeof data.packet_id === "number"
      default:
        return false
    }
  })
}

function isPrintableGLSData(data: Record<string, unknown>) {
  return (
    (typeof data.packet_id === "number" || isNonEmptyString(data.packet_id)) &&
    isNonEmptyString(data.barcode) &&
    isNonEmptyString(data.config_id) &&
    (data.environment === "testing" || data.environment === "production")
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}
