import { MedusaError } from "@medusajs/framework/utils"

import { GLS_PROVIDER_ID } from "../../../modules/gls-client"

interface GLSFulfillmentRecord {
  id: string
  provider_id: string
  canceled_at: string | null
  data: Record<string, unknown> | null
}

export interface GLSLabelOrder {
  id: string
  display_id?: number | null
  fulfillments?: GLSFulfillmentRecord[]
}

export interface PrintableGLSLabel {
  order_id: string
  order_display_id?: number | null
  fulfillment_id: string
  packet_id: string | number
  barcode: string
}

interface PrintableGLSFulfillmentData {
  packet_id: string | number
  barcode: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isGLSFulfillmentRecord = (
  value: unknown,
): value is GLSFulfillmentRecord => {
  if (!isRecord(value)) {
    return false
  }

  const { canceled_at: canceledAt, data, id, provider_id: providerId } = value
  const hasValidCanceledAt =
    canceledAt === null || typeof canceledAt === "string"
  const hasValidData = data === null || isRecord(data)

  return (
    typeof id === "string" &&
    typeof providerId === "string" &&
    hasValidCanceledAt &&
    hasValidData
  )
}

const isGLSLabelOrder = (value: unknown): value is GLSLabelOrder => {
  if (!isRecord(value)) {
    return false
  }

  const { display_id: displayId, fulfillments, id } = value
  const hasValidDisplayId =
    displayId === undefined ||
    displayId === null ||
    typeof displayId === "number"
  const hasValidFulfillments =
    fulfillments === undefined ||
    (Array.isArray(fulfillments) && fulfillments.every(isGLSFulfillmentRecord))

  return typeof id === "string" && hasValidDisplayId && hasValidFulfillments
}

const isPrintableGLSFulfillmentData = (
  value: unknown,
): value is PrintableGLSFulfillmentData => {
  if (!isRecord(value)) {
    return false
  }

  const { barcode, packet_id: packetId } = value
  const hasValidPacketId =
    typeof packetId === "number" || typeof packetId === "string"

  return (
    hasValidPacketId && typeof barcode === "string" && barcode.trim().length > 0
  )
}

const collectOrderLabels = (
  order: GLSLabelOrder,
): {
  data: PrintableGLSFulfillmentData
  fulfillment: GLSFulfillmentRecord
}[] => {
  const orderLabels: {
    data: PrintableGLSFulfillmentData
    fulfillment: GLSFulfillmentRecord
  }[] = []

  for (const fulfillment of order.fulfillments ?? []) {
    const isActiveGLSFulfillment =
      fulfillment.provider_id === GLS_PROVIDER_ID &&
      (fulfillment.canceled_at === null || fulfillment.canceled_at.length === 0)
    if (
      isActiveGLSFulfillment &&
      isPrintableGLSFulfillmentData(fulfillment.data)
    ) {
      orderLabels.push({ data: fulfillment.data, fulfillment })
    }
  }

  return orderLabels
}

const sanitizeFilenameToken = (value: string): string => {
  const sanitized = value
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]/gu, "-")
    .replaceAll(/-+/gu, "-")
    .slice(0, 80)

  return sanitized || "unknown"
}

export const validateGLSLabelOrders = (value: unknown): GLSLabelOrder[] => {
  if (Array.isArray(value) && value.every(isGLSLabelOrder)) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Invalid order label query result",
  )
}

export const collectPrintableGLSLabels = (
  requestedOrderIds: string[],
  orders: GLSLabelOrder[],
): PrintableGLSLabel[] => {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const missingOrderIds: string[] = []
  const ordersWithoutGLSLabels: string[] = []
  const labels: PrintableGLSLabel[] = []

  for (const orderId of requestedOrderIds) {
    const order = ordersById.get(orderId)
    if (order) {
      const orderLabels = collectOrderLabels(order)
      if (orderLabels.length === 0) {
        ordersWithoutGLSLabels.push(orderId)
      } else {
        for (const { data, fulfillment } of orderLabels) {
          labels.push({
            barcode: data.barcode,
            fulfillment_id: fulfillment.id,
            order_display_id: order.display_id,
            order_id: order.id,
            packet_id: data.packet_id,
          })
        }
      }
    } else {
      missingOrderIds.push(orderId)
    }
  }

  if (missingOrderIds.length > 0 || ordersWithoutGLSLabels.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      [
        missingOrderIds.length > 0
          ? `Orders not found: ${missingOrderIds.join(", ")}`
          : null,
        ordersWithoutGLSLabels.length > 0
          ? `Orders without GLS packet labels: ${ordersWithoutGLSLabels.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; "),
    )
  }

  return labels
}

export const buildGLSLabelsFilename = (labels: PrintableGLSLabel[]): string => {
  const [first] = labels
  if (labels.length === 1 && first) {
    return `gls-label-${sanitizeFilenameToken(first.barcode)}.pdf`
  }
  return `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}
