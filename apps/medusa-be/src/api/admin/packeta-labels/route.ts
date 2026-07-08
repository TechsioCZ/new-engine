import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { PDFDocument } from "pdf-lib"
import {
  PACKETA_CLIENT_MODULE,
  type PacketaClientModuleService,
} from "../../../modules/packeta-client"
import type {
  PacketaFulfillmentData,
  PacketaLabelFormat,
} from "../../../modules/packeta-client/types"
import type { PostAdminPacketaLabelsSchemaType } from "./validators"

type PacketaFulfillmentRecord = {
  id: string
  provider_id: string
  canceled_at: string | null
  data: Record<string, unknown> | null
}

type OrderWithFulfillments = {
  id: string
  display_id?: number | null
  fulfillments?: PacketaFulfillmentRecord[]
}

type PrintablePacketaLabel = {
  order_id: string
  order_display_id?: number | null
  fulfillment_id: string
  packet_id: number
  barcode?: string
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const A4_LABEL_COLUMNS = 2
const A4_LABEL_ROWS = 2
const A4_LABELS_PER_PAGE = A4_LABEL_COLUMNS * A4_LABEL_ROWS

export async function POST(
  req: MedusaRequest<PostAdminPacketaLabelsSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const {
    order_ids: orderIds,
    label_format: labelFormat,
    label_offset,
  } = req.validatedBody

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const packetaClient = req.scope.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE
  )

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "fulfillments.id",
      "fulfillments.provider_id",
      "fulfillments.canceled_at",
      "fulfillments.data",
    ],
    filters: {
      id: orderIds,
    },
  })

  const labels = collectPrintableLabels(
    orderIds,
    orders as OrderWithFulfillments[]
  )

  const labelPdfs = await Promise.all(
    labels.map((label) =>
      packetaClient.downloadLabelPdf(
        label.packet_id,
        labelFormat as PacketaLabelFormat | undefined,
        0
      )
    )
  )

  const pdfBytes = await composeLabelsOnA4(labelPdfs, label_offset ?? 0)
  const buffer = Buffer.from(pdfBytes)
  const filename = buildFilename(labels)

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
  })
  res.send(buffer)
}

function collectPrintableLabels(
  requestedOrderIds: string[],
  orders: OrderWithFulfillments[]
): PrintablePacketaLabel[] {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const missingOrderIds: string[] = []
  const ordersWithoutPacketaLabels: string[] = []
  const labels: PrintablePacketaLabel[] = []

  for (const orderId of requestedOrderIds) {
    const order = ordersById.get(orderId)
    if (!order) {
      missingOrderIds.push(orderId)
      continue
    }

    const orderLabels = (order.fulfillments ?? [])
      .filter((fulfillment) => fulfillment.provider_id === "packeta_packeta")
      .filter((fulfillment) => !fulfillment.canceled_at)
      .map((fulfillment) => ({
        fulfillment,
        data: fulfillment.data,
      }))
      .filter(
        (
          item
        ): item is {
          fulfillment: PacketaFulfillmentRecord
          data: PacketaFulfillmentData
        } => typeof item.data?.packet_id === "number"
      )

    if (orderLabels.length === 0) {
      ordersWithoutPacketaLabels.push(orderId)
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

  if (missingOrderIds.length > 0 || ordersWithoutPacketaLabels.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      [
        missingOrderIds.length > 0
          ? `Orders not found: ${missingOrderIds.join(", ")}`
          : null,
        ordersWithoutPacketaLabels.length > 0
          ? `Orders without Packeta packet labels: ${ordersWithoutPacketaLabels.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("; ")
    )
  }

  return labels
}

async function composeLabelsOnA4(
  labelPdfs: Buffer[],
  labelOffset: number
): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()
  const cellWidth = A4_WIDTH / A4_LABEL_COLUMNS
  const cellHeight = A4_HEIGHT / A4_LABEL_ROWS
  let currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
  let slot = labelOffset

  for (const labelPdf of labelPdfs) {
    if (slot >= A4_LABELS_PER_PAGE) {
      currentPage = mergedPdf.addPage([A4_WIDTH, A4_HEIGHT])
      slot = 0
    }

    const sourcePdf = await PDFDocument.load(labelPdf)
    const sourcePage = sourcePdf.getPages()[0]

    if (!sourcePage) {
      continue
    }

    const embeddedPage = await mergedPdf.embedPage(sourcePage)
    const { height: sourceHeight, width: sourceWidth } = sourcePage.getSize()
    const scale = Math.min(cellWidth / sourceWidth, cellHeight / sourceHeight)
    const width = sourceWidth * scale
    const height = sourceHeight * scale
    const column = slot % A4_LABEL_COLUMNS
    const row = Math.floor(slot / A4_LABEL_COLUMNS)
    const x = column * cellWidth + (cellWidth - width) / 2
    const y = A4_HEIGHT - (row + 1) * cellHeight + (cellHeight - height) / 2

    currentPage.drawPage(embeddedPage, {
      height,
      width,
      x,
      y,
    })

    slot += 1
  }

  return mergedPdf.save()
}

function buildFilename(labels: PrintablePacketaLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first?.barcode) {
    return `packeta-label-${first.barcode}.pdf`
  }
  return `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}
