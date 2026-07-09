import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  PACKETA_CLIENT_MODULE,
  type PacketaClientModuleService,
} from "../../../modules/packeta-client"
import type {
  PacketaFulfillmentData,
  PacketaLabelFormat,
} from "../../../modules/packeta-client/types"
import { composePacketaLabelsOnA4 } from "./label-pdf"
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

const PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE = 10

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

  const labelPdfs = await downloadLabelPdfsInChunks(
    labels,
    packetaClient,
    labelFormat as PacketaLabelFormat | undefined
  )

  const pdfBytes = await composePacketaLabelsOnA4(
    labelPdfs,
    label_offset ?? 0,
    labelFormat
  )
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

async function downloadLabelPdfsInChunks(
  labels: PrintablePacketaLabel[],
  packetaClient: PacketaClientModuleService,
  labelFormat: PacketaLabelFormat | undefined
): Promise<Buffer[]> {
  const labelPdfs: Buffer[] = []

  for (
    let index = 0;
    index < labels.length;
    index += PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE
  ) {
    const chunk = labels.slice(index, index + PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE)
    const chunkPdfs = await Promise.all(
      chunk.map((label) =>
        packetaClient.downloadLabelPdf(label.packet_id, labelFormat, 0)
      )
    )

    labelPdfs.push(...chunkPdfs)
  }

  return labelPdfs
}

function buildFilename(labels: PrintablePacketaLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first?.barcode) {
    return `packeta-label-${first.barcode}.pdf`
  }
  return `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}
