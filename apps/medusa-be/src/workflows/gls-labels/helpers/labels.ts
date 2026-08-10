import type { FulfillmentDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { GLS_PROVIDER_ID } from "../../../modules/gls-client"

interface GLSFulfillmentRecord {
  id: string
  provider_id: string
  canceled_at: Date | string | null
  data: FulfillmentDTO["data"]
}

export interface GLSLabelOrder {
  id: string
  display_id: number | null
  fulfillments?: (GLSFulfillmentRecord | null)[] | null
}

export interface PrintableGLSLabel {
  order_id: string
  order_display_id: number | null
  fulfillment_id: string
  packet_id: string | number
  barcode: string
}

interface PrintableGLSFulfillmentData {
  packet_id: string | number
  barcode: string
}

const PrintableGLSFulfillmentDataSchema = z.object({
  barcode: z.string().trim().min(1),
  packet_id: z.union([z.string(), z.number()]),
})

const parsePrintableGLSFulfillmentData = (
  value: FulfillmentDTO["data"],
): PrintableGLSFulfillmentData | undefined => {
  const parsed = PrintableGLSFulfillmentDataSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const toPrintableGLSLabel = (
  order: GLSLabelOrder,
  fulfillment: GLSFulfillmentRecord,
  data: PrintableGLSFulfillmentData,
): PrintableGLSLabel => ({
  barcode: data.barcode,
  fulfillment_id: fulfillment.id,
  order_display_id: order.display_id,
  order_id: order.id,
  packet_id: data.packet_id,
})

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
    if (fulfillment === null) {
      continue
    }

    const isActiveGLSFulfillment =
      fulfillment.provider_id === GLS_PROVIDER_ID &&
      (fulfillment.canceled_at === null || fulfillment.canceled_at === "")
    const data = parsePrintableGLSFulfillmentData(fulfillment.data)
    if (isActiveGLSFulfillment && data !== undefined) {
      orderLabels.push({ data, fulfillment })
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
          labels.push(toPrintableGLSLabel(order, fulfillment, data))
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
