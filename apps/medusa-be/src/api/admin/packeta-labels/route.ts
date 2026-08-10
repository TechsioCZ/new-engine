import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { PACKETA_CLIENT_MODULE } from "../../../modules/packeta-client"
import type { PacketaClientModuleService } from "../../../modules/packeta-client"
import type { PacketaLabelFormat } from "../../../modules/packeta-client/types"
import { composePacketaLabelsOnA4 } from "./label-pdf"
import type { PostAdminPacketaLabelsSchemaType } from "./validators"

const packetaFulfillmentDataSchema = z
  .object({
    barcode: z.json().optional(),
    packet_id: z.json().optional(),
  })
  .catchall(z.json())
const fulfillmentSchema = z.object({
  canceled_at: z.string().nullable(),
  data: packetaFulfillmentDataSchema.nullable(),
  id: z.string(),
  provider_id: z.string(),
})
const orderSchema = z.object({
  display_id: z.number().nullable().optional(),
  fulfillments: z.array(fulfillmentSchema).optional(),
  id: z.string(),
})
const ordersSchema = z.array(orderSchema)

type PacketaFulfillmentRecord = z.infer<typeof fulfillmentSchema>
type OrderWithFulfillments = z.infer<typeof orderSchema>
type PacketaLabelDownloader = Pick<
  PacketaClientModuleService,
  "downloadLabelPdf"
>

interface PrintablePacketaLabel {
  barcode?: string
  fulfillment_id: string
  order_display_id?: number | null
  order_id: string
  packet_id: number
}

const PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE = 10

const toPrintableLabel = (
  order: OrderWithFulfillments,
  fulfillment: PacketaFulfillmentRecord,
): PrintablePacketaLabel | null => {
  if (
    fulfillment.provider_id !== "packeta_packeta" ||
    (fulfillment.canceled_at !== null && fulfillment.canceled_at.length > 0) ||
    fulfillment.data === null
  ) {
    return null
  }

  const { packet_id: packetId } = fulfillment.data
  if (typeof packetId !== "number") {
    return null
  }

  const { barcode } = fulfillment.data
  return {
    ...(typeof barcode === "string" ? { barcode } : {}),
    fulfillment_id: fulfillment.id,
    ...(order.display_id === undefined
      ? {}
      : { order_display_id: order.display_id }),
    order_id: order.id,
    packet_id: packetId,
  }
}

const collectPrintableLabels = (
  requestedOrderIds: string[],
  orders: OrderWithFulfillments[],
): PrintablePacketaLabel[] => {
  const ordersById = new Map(orders.map((order) => [order.id, order]))
  const missingOrderIds: string[] = []
  const ordersWithoutPacketaLabels: string[] = []
  const labels: PrintablePacketaLabel[] = []

  for (const orderId of requestedOrderIds) {
    const order = ordersById.get(orderId)

    if (order === undefined) {
      missingOrderIds.push(orderId)
    } else {
      const labelCountBeforeOrder = labels.length

      for (const fulfillment of order.fulfillments ?? []) {
        const label = toPrintableLabel(order, fulfillment)
        if (label !== null) {
          labels.push(label)
        }
      }

      if (labels.length === labelCountBeforeOrder) {
        ordersWithoutPacketaLabels.push(orderId)
      }
    }
  }

  if (missingOrderIds.length > 0 || ordersWithoutPacketaLabels.length > 0) {
    const messages: string[] = []
    if (missingOrderIds.length > 0) {
      messages.push(`Orders not found: ${missingOrderIds.join(", ")}`)
    }
    if (ordersWithoutPacketaLabels.length > 0) {
      messages.push(
        `Orders without Packeta packet labels: ${ordersWithoutPacketaLabels.join(", ")}`,
      )
    }

    throw new MedusaError(MedusaError.Types.INVALID_DATA, messages.join("; "))
  }

  return labels
}

const downloadLabelPdfsInChunks = async (
  labels: PrintablePacketaLabel[],
  packetaClient: PacketaLabelDownloader,
  labelFormat: PacketaLabelFormat | undefined,
  startIndex = 0,
): Promise<Buffer[]> => {
  if (startIndex >= labels.length) {
    return []
  }

  const chunk = labels.slice(
    startIndex,
    startIndex + PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE,
  )
  const chunkPdfs = await Promise.all(
    chunk.map(
      async (label) =>
        await packetaClient.downloadLabelPdf(label.packet_id, labelFormat, 0),
    ),
  )
  const completedChunk = {
    nextIndex: startIndex + PACKETA_LABEL_DOWNLOAD_CHUNK_SIZE,
    pdfs: chunkPdfs,
  }
  const remainingPdfs = await downloadLabelPdfsInChunks(
    labels,
    packetaClient,
    labelFormat,
    completedChunk.nextIndex,
  )

  return [...completedChunk.pdfs, ...remainingPdfs]
}

const buildFilename = (labels: PrintablePacketaLabel[]): string => {
  const [first] = labels
  if (
    labels.length === 1 &&
    first?.barcode !== undefined &&
    first.barcode.length > 0
  ) {
    return `packeta-label-${first.barcode}.pdf`
  }
  return `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}

interface PacketaLabelsPdf {
  buffer: Buffer
  filename: string
}

export const createPacketaLabelsPdf = async (
  graphData: unknown,
  requestedOrderIds: string[],
  packetaClient: PacketaLabelDownloader,
  labelFormat: PacketaLabelFormat | undefined,
  labelOffset: number,
): Promise<PacketaLabelsPdf> => {
  const orders = ordersSchema.parse(graphData)
  const labels = collectPrintableLabels(requestedOrderIds, orders)
  const labelPdfs = await downloadLabelPdfsInChunks(
    labels,
    packetaClient,
    labelFormat,
  )
  const pdfBytes = await composePacketaLabelsOnA4(
    labelPdfs,
    labelOffset,
    labelFormat,
  )

  return {
    buffer: Buffer.from(pdfBytes),
    filename: buildFilename(labels),
  }
}

const postHandler = async (
  req: MedusaRequest<PostAdminPacketaLabelsSchemaType>,
  res: MedusaResponse,
): Promise<void> => {
  const {
    order_ids: orderIds,
    label_format: labelFormat,
    label_offset,
  } = req.validatedBody

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const packetaClient = req.scope.resolve<PacketaClientModuleService>(
    PACKETA_CLIENT_MODULE,
  )

  const graphResult = await query.graph({
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
  const { buffer, filename } = await createPacketaLabelsPdf(
    graphResult.data,
    orderIds,
    packetaClient,
    labelFormat,
    label_offset ?? 0,
  )

  res.set({
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": buffer.length,
    "Content-Type": "application/pdf",
  })
  res.send(buffer)
}

export { postHandler as POST }
