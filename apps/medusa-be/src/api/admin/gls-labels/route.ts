import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  GLS_CLIENT_MODULE,
  type GLSClientModuleService,
} from "../../../modules/gls-client"
import type {
  GLSFulfillmentData,
  GLSLabelFormat,
} from "../../../modules/gls-client/types"
import { composeGLSLabelsOnA4 } from "./label-pdf"
import type { PostAdminGLSLabelsSchemaType } from "./validators"

type GLSFulfillmentRecord = {
  id: string
  provider_id: string
  canceled_at: string | null
  data: Record<string, unknown> | null
}

type OrderWithFulfillments = {
  id: string
  display_id?: number | null
  fulfillments?: GLSFulfillmentRecord[]
}

type PrintableGLSLabel = {
  order_id: string
  order_display_id?: number | null
  fulfillment_id: string
  packet_id: string | number
  barcode?: string
}

const GLS_LABEL_DOWNLOAD_CHUNK_SIZE = 10

export async function POST(
  req: MedusaRequest<PostAdminGLSLabelsSchemaType>,
  res: MedusaResponse
): Promise<void> {
  const {
    order_ids: orderIds,
    label_format: labelFormat,
    label_offset,
  } = req.validatedBody

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const glsClient = req.scope.resolve<GLSClientModuleService>(GLS_CLIENT_MODULE)

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
  const resolvedLabelOffset = await resolveLabelOffset(glsClient, label_offset)

  const labelPdfs = await downloadLabelPdfsInChunks(
    labels,
    glsClient,
    labelFormat as GLSLabelFormat | undefined,
    resolvedLabelOffset
  )

  const pdfBytes = await composeGLSLabelsOnA4(
    labelPdfs,
    resolvedLabelOffset,
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
      .filter((fulfillment) => fulfillment.provider_id === "gls_gls")
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

async function resolveLabelOffset(
  glsClient: GLSClientModuleService,
  requestLabelOffset: number | undefined
): Promise<number> {
  if (requestLabelOffset !== undefined) {
    return requestLabelOffset
  }

  const config = await glsClient.getConfig()
  return config?.default_label_offset ?? 0
}

async function downloadLabelPdfsInChunks(
  labels: PrintableGLSLabel[],
  glsClient: GLSClientModuleService,
  labelFormat: GLSLabelFormat | undefined,
  labelOffset: number
): Promise<Buffer[]> {
  const labelPdfs: Buffer[] = []

  for (
    let index = 0;
    index < labels.length;
    index += GLS_LABEL_DOWNLOAD_CHUNK_SIZE
  ) {
    const chunk = labels.slice(index, index + GLS_LABEL_DOWNLOAD_CHUNK_SIZE)
    const chunkPdfs = await Promise.all(
      chunk.map((label) =>
        glsClient.downloadLabelPdf(label.packet_id, labelFormat, labelOffset)
      )
    )

    labelPdfs.push(...chunkPdfs)
  }

  return labelPdfs
}

function buildFilename(labels: PrintableGLSLabel[]): string {
  const first = labels[0]
  if (labels.length === 1 && first?.barcode) {
    return `gls-label-${first.barcode}.pdf`
  }
  return `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
}
