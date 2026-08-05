import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  updateOrderWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

import { invoicesBatchClientMapperHelper } from "./client-mapper-helper"
import type { InvoiceOrderLookupKeys } from "./client-mapper-helper"
import type { InvoiceInput } from "./types"

type Metadata = Record<string, unknown>

export interface ExistingOrder {
  id: string
  display_id: number
  metadata: Metadata | null
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
    if (!invoice.data) {
      return null
    }
    const { result } = await uploadFilesWorkflow(this.container).run({
      input: {
        files: [this.mapper.buildUploadPayload(invoice)] as never,
      },
    })
    return result?.[0] ?? null
  }

  async attachInvoice(
    order: ExistingOrder,
    invoice: InvoiceInput,
    uploaded: UploadedInvoice | null,
    userId?: string,
  ): Promise<string> {
    const invoiceUrl = this.mapper.buildInvoiceUrl(invoice, uploaded)
    if (!invoiceUrl) {
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
    return (data ?? []) as ExistingOrder[]
  }

  private async queryOrderIdsByMetadata(
    key: string,
    values: InvoiceOrderLookupKeys["erpIds"],
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
          [key]: [...values],
        },
      },
    })
    for (const row of (data ?? []) as { id: string }[]) {
      ids.add(row.id)
    }
    return ids
  }
}
