import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  updateOrderWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  type InvoiceOrderLookupKeys,
  invoicesBatchClientMapperHelper,
} from "./client-mapper-helper"
import type { InvoiceInput } from "./types"

type Metadata = Record<string, unknown>

export type ExistingOrder = {
  id: string
  display_id: number
  metadata: Metadata | null
}

export type ExistingOrderIndex = {
  byId: Map<string, ExistingOrder>
  byDisplayId: Map<string, ExistingOrder>
  byErpId: Map<string, ExistingOrder>
}

export type UploadedInvoice = {
  id: string
  url: string
}

const ORDER_FIELDS = ["id", "display_id", "metadata"] as const

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
      erpIds
    )
    const [byIdOrders, byDisplayIdOrders, metadataOrders] = await Promise.all([
      this.queryOrders({ id: Array.from(orderIds) }),
      this.queryOrders({ display_id: Array.from(displayIds) }),
      this.queryOrders({ id: Array.from(metadataOrderIds) }),
    ])
    return this.mapper.buildOrderIndex([
      ...byIdOrders,
      ...byDisplayIdOrders,
      ...metadataOrders,
    ])
  }

  findExistingOrder(
    invoice: InvoiceInput,
    index: ExistingOrderIndex
  ): ExistingOrder | null {
    return this.mapper.findExistingOrder(invoice, index)
  }

  async uploadInvoice(invoice: InvoiceInput): Promise<UploadedInvoice | null> {
    if (!invoice.data) {
      return null
    }
    const { result } = await uploadFilesWorkflow(this.container).run({
      input: {
        files: [this.mapper.buildUploadPayload(invoice)] as never,
      },
    })
    return (result?.[0] ?? null) as UploadedInvoice | null
  }

  async attachInvoice(
    order: ExistingOrder,
    invoice: InvoiceInput,
    uploaded: UploadedInvoice | null,
    userId?: string
  ): Promise<string> {
    const invoiceUrl = this.mapper.buildInvoiceUrl(invoice, uploaded)
    if (!invoiceUrl) {
      throw new Error("Invoice URL was not provided or uploaded")
    }
    await updateOrderWorkflow(this.container).run({
      input: {
        id: order.id,
        user_id: userId ?? "symmy-plugin",
        metadata: this.mapper.buildUpdatedMetadata(
          order.metadata,
          invoice,
          invoiceUrl,
          uploaded
        ),
      },
    })
    return invoiceUrl
  }

  private async queryOrders(
    filters: Record<string, string[] | number[]>
  ): Promise<ExistingOrder[]> {
    if (Object.values(filters).every((values) => values.length === 0)) {
      return []
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: ORDER_FIELDS as unknown as string[],
      filters,
    })
    return (data ?? []) as ExistingOrder[]
  }

  private async queryOrderIdsByMetadata(
    key: string,
    values: InvoiceOrderLookupKeys["erpIds"]
  ): Promise<Set<string>> {
    const ids = new Set<string>()
    if (!values.size) {
      return ids
    }
    const { data } = await this.query.graph({
      entity: "order",
      fields: ["id"],
      filters: {
        metadata: {
          [key]: Array.from(values),
        },
      },
    })
    for (const row of (data ?? []) as { id: string }[]) {
      ids.add(row.id)
    }
    return ids
  }
}
