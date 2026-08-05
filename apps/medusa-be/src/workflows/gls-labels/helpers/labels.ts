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

export function validateGLSLabelOrders(value: unknown): GLSLabelOrder[] {
  if (Array.isArray(value) && value.every(isGLSLabelOrder)) {
    return value
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "GLS: Invalid order label query result",
  )
}

export function collectPrintableGLSLabels(
  requestedOrderIds: string[],
  orders: GLSLabelOrder[],
): PrintableGLSLabel[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const missingOrderIds: string[] = []
  const ordersWithoutGLSLabels: string[] = []
  const labels: PrintableGLSLabel[] = []

  for (const orderId of requestedOrderIds) {
    const order = ordersById.get(orderId)
    if (!order) {
      missingOrderIds.push(orderId)
      continue
    }

    const orderLabels = (order.fulfillments ?? [])
      .filter((fulfillment) => fulfillment.provider_id === GLS_PROVIDER_ID)
      .filter((fulfillment) => !fulfillment.canceled_at)
      .map((fulfillment) => ({
        data: fulfillment.data,
        fulfillment,
      }))
      .filter(
        (
          item,
        ): item is {
          fulfillment: GLSFulfillmentRecord
          data: PrintableGLSFulfillmentData
        } => isPrintableGLSFulfillmentData(item.data),
      )

    if (orderLabels.length === 0) {
      ordersWithoutGLSLabels.push(orderId)
      continue
    }

    for (const { fulfillment, data } of orderLabels) {
      labels.push({
        barcode: data.barcode,
        fulfillment_id: fulfillment.id,
        order_display_id: order.display_id,
        order_id: order.id,
        packet_id: data.packet_id,
      })
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

export function buildGLSLabelsFilename(labels: PrintableGLSLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first) {
    return `gls-label-${sanitizeFilenameToken(first.barcode)}.pdf`
  }
  return `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isGLSLabelOrder(value: unknown): value is GLSLabelOrder {
  if (!isRecord(value)) {
    return false
  }

  const id: unknown = value.id
  const displayId: unknown = value.display_id
  const fulfillments: unknown = value.fulfillments

  return (
    typeof id === "string" &&
    (displayId === undefined ||
      displayId === null ||
      typeof displayId === "number") &&
    (fulfillments === undefined ||
      (Array.isArray(fulfillments) &&
        fulfillments.every(isGLSFulfillmentRecord)))
  )
}

function isGLSFulfillmentRecord(value: unknown): value is GLSFulfillmentRecord {
  if (!isRecord(value)) {
    return false
  }

  const id: unknown = value.id
  const providerId: unknown = value.provider_id
  const canceledAt: unknown = value.canceled_at
  const data: unknown = value.data

  return (
    typeof id === "string" &&
    typeof providerId === "string" &&
    (canceledAt === null || typeof canceledAt === "string") &&
    (data === null || isRecord(data))
  )
}

function isPrintableGLSFulfillmentData(
  value: unknown,
): value is PrintableGLSFulfillmentData {
  if (!isRecord(value)) {
    return false
  }

  const packetId: unknown = value.packet_id
  const barcode: unknown = value.barcode

  return (
    (typeof packetId === "number" || typeof packetId === "string") &&
    typeof barcode === "string" &&
    barcode.trim().length > 0
  )
}

function sanitizeFilenameToken(value: string): string {
  const sanitized = value
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]/g, "-")
    .replaceAll(/-+/g, "-")
    .slice(0, 80)

  return sanitized || "unknown"
}
