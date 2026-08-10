import type { MedusaContainer, MetadataType } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  updateOrderWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

import { invoicesBatchClientMapperHelper } from "./client-mapper-helper"
import type { InvoiceOrderLookupKeys } from "./client-mapper-helper"
import type { InvoiceInput } from "./types"

export interface ExistingOrder {
  id: string
  display_id: number
  metadata: MetadataType
}

export interface ExistingOrderIndex {
  byId: Map<string, ExistingOrder>
  byDisplayId: Map<string, ExistingOrder>
  byErpId: Map<string, ExistingOrder>
}

export interface UploadedInvoice {
  id: string
  url: string
}

const ORDER_FIELDS = ["id", "display_id", "metadata"] as const
const metadataSchema = z.record(z.string(), z.json()).nullable()

const decodeOrder = (value: unknown): ExistingOrder | null => {
  if (typeof value !== "object" || value === null) {
    return null
  }
  if (!("id" in value) || typeof value.id !== "string") {
    return null
  }
  if (!("display_id" in value) || typeof value.display_id !== "number") {
    return null
  }
  if (!("metadata" in value)) {
    return null
  }
  const metadata = metadataSchema.safeParse(value.metadata)
  if (!metadata.success) {
    return null
  }
  return { display_id: value.display_id, id: value.id, metadata: metadata.data }
}

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

export class InvoicesBatchClient {
  private readonly container: MedusaContainer
  private readonly mapper = invoicesBatchClientMapperHelper
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(invoices: InvoiceInput[]): Promise<ExistingOrderIndex> {
    const { orderIds, displayIds, erpIds } =
      this.mapper.collectOrderLookupKeys(invoices)
    const metadataOrderIds = await this.queryOrderIdsByMetadata(
      "erp_id",
      erpIds,
    )
    const [byIdOrders, byDisplayIdOrders, metadataOrders] = await Promise.all([
      this.queryOrders({ id: [...orderIds] }),
      this.queryOrders({ display_id: [...displayIds] }),
      this.queryOrders({ id: [...metadataOrderIds] }),
    ])
    return this.mapper.buildOrderIndex([
      ...byIdOrders,
      ...byDisplayIdOrders,
      ...metadataOrders,
    ])
  }

  findExistingOrder(
    invoice: InvoiceInput,
    index: ExistingOrderIndex,
  ): ExistingOrder | null {
    return this.mapper.findExistingOrder(invoice, index)
  }

  async uploadInvoice(invoice: InvoiceInput): Promise<UploadedInvoice | null> {
    if (invoice.data === undefined) {
      return null
    }
    const { result } = await uploadFilesWorkflow(this.container).run({
      input: {
        files: [this.mapper.buildUploadPayload(invoice)],
      },
    })
    return result[0] ?? null
  }

  async attachInvoice(
    order: ExistingOrder,
    invoice: InvoiceInput,
    uploaded: UploadedInvoice | null,
    userId?: string,
  ): Promise<string> {
    const invoiceUrl = this.mapper.buildInvoiceUrl(invoice, uploaded)
    if (invoiceUrl === undefined || invoiceUrl.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invoice URL was not provided or uploaded",
      )
    }
    await updateOrderWorkflow(this.container).run({
      input: {
        id: order.id,
        metadata: this.mapper.buildUpdatedMetadata(
          order.metadata,
          invoice,
          invoiceUrl,
          uploaded,
        ),
        user_id: userId ?? "symmy-plugin",
      },
    })
    return invoiceUrl
  }

  private async queryOrders(
    filters: Record<string, string[] | number[]>,
  ): Promise<ExistingOrder[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: [...ORDER_FIELDS],
      filters,
    })
    const rows: unknown[] = data ?? []
    return rows.flatMap((row) => {
      const order = decodeOrder(row)
      return order === null ? [] : [order]
    })
  }

  private async queryOrderIdsByMetadata(
    key: string,
    values: InvoiceOrderLookupKeys["erpIds"],
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    if (values.size === 0) {
      return ids
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: ["id"],
      filters: {
        metadata: {
          [key]: [...values],
        },
      },
    })
    const rows: unknown[] = data ?? []
    for (const row of rows) {
      if (
        typeof row === "object" &&
        row !== null &&
        "id" in row &&
        typeof row.id === "string"
      ) {
        ids.add(row.id)
      }
    }
    return ids
  }
}
