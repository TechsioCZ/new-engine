import { MedusaError } from "@medusajs/framework/utils"
import type { GLSFulfillmentData } from "../../../modules/gls-client"
import { GLS_PROVIDER_ID } from "../../../modules/gls-client"

type GLSFulfillmentRecord = {
  id: string
  provider_id: string
  canceled_at: string | null
  data: Record<string, unknown> | null
}

export type GLSLabelOrder = {
  id: string
  display_id?: number | null
  fulfillments?: GLSFulfillmentRecord[]
}

export type PrintableGLSLabel = {
  order_id: string
  order_display_id?: number | null
  fulfillment_id: string
  packet_id: string | number
  barcode?: string
}

export function collectPrintableGLSLabels(
  requestedOrderIds: string[],
  orders: GLSLabelOrder[]
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
        fulfillment,
        data: fulfillment.data,
      }))
      .filter(
        (
          item
        ): item is {
          fulfillment: GLSFulfillmentRecord
          data: GLSFulfillmentData
        } =>
          typeof item.data?.packet_id === "number" ||
          typeof item.data?.packet_id === "string"
      )

    if (orderLabels.length === 0) {
      ordersWithoutGLSLabels.push(orderId)
      continue
    }

    for (const { fulfillment, data } of orderLabels) {
      labels.push({
        order_id: order.id,
        order_display_id: order.display_id,
        fulfillment_id: fulfillment.id,
        packet_id: data.packet_id,
        barcode: data.barcode,
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
        .join("; ")
    )
  }

  return labels
}

export function buildGLSLabelsFilename(labels: PrintableGLSLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first?.barcode) {
    return `gls-label-${first.barcode}.pdf`
  }
  return `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}
