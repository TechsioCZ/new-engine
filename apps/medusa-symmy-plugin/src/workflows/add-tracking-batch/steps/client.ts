import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
} from "@medusajs/medusa/core-flows"
import type { TrackingItemInput, TrackingShipmentInput } from "../types"

type Metadata = Record<string, unknown>

type OrderLineItem = {
  id: string
  quantity: number
  variant_sku?: string | null
}

export type ExistingOrder = {
  id: string
  display_id: number
  metadata: Metadata | null
  items: OrderLineItem[]
}

export type TrackingOrderCache = {
  byId: Map<string, ExistingOrder>
  byDisplayId: Map<string, ExistingOrder>
  byErpId: Map<string, ExistingOrder>
}

export type ResolvedTrackingItems = {
  id: string
  quantity: number
}[]

export type TrackingApplyResult = {
  fulfillmentId: string
  shipmentId: string
  notificationSent: boolean
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "metadata",
  "items.id",
  "items.quantity",
  "items.variant_sku",
] as const

const getQuery = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.QUERY)

export type Query = ReturnType<typeof getQuery>

const stringMetadataValue = (
  metadata: Metadata | null | undefined,
  key: string
) => {
  const value = metadata?.[key]
  return typeof value === "string" && value.length ? value : null
}

export class TrackingBatchClient {
  private readonly container: MedusaContainer
  private readonly query: Query

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(
    shipments: TrackingShipmentInput[]
  ): Promise<TrackingOrderCache> {
    const orderIds = new Set<string>()
    const displayIds = new Set<number>()
    const erpIds = new Set<string>()

    for (const shipment of shipments) {
      if (shipment.identifier_type === "order_id" && shipment.order_id) {
        orderIds.add(shipment.order_id)
      }
      if (shipment.identifier_type === "display_id" && shipment.display_id) {
        const displayId = Number(shipment.display_id)
        if (Number.isInteger(displayId)) {
          displayIds.add(displayId)
        }
      }
      if (shipment.identifier_type === "erp_id" && shipment.erp_id) {
        erpIds.add(shipment.erp_id)
      }
    }

    const metadataOrderIds = await this.queryOrderIdsByMetadata(
      "erp_id",
      erpIds
    )
    const [byIdOrders, byDisplayIdOrders, scannedOrders] = await Promise.all([
      this.queryOrders({ id: Array.from(orderIds) }),
      this.queryOrders({ display_id: Array.from(displayIds) }),
      this.queryOrders({ id: Array.from(metadataOrderIds) }),
    ])

    return this.buildOrderCache([
      ...byIdOrders,
      ...byDisplayIdOrders,
      ...scannedOrders,
    ])
  }

  findExistingOrder(
    shipment: TrackingShipmentInput,
    cache: TrackingOrderCache
  ): ExistingOrder | null {
    if (shipment.identifier_type === "order_id" && shipment.order_id) {
      return cache.byId.get(shipment.order_id) ?? null
    }
    if (shipment.identifier_type === "display_id" && shipment.display_id) {
      return cache.byDisplayId.get(shipment.display_id) ?? null
    }
    if (shipment.identifier_type === "erp_id" && shipment.erp_id) {
      return cache.byErpId.get(shipment.erp_id) ?? null
    }
    return null
  }

  resolveItems(
    order: ExistingOrder,
    requestedItems: TrackingItemInput[] | undefined
  ): ResolvedTrackingItems {
    if (!requestedItems?.length) {
      return order.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }))
    }

    const itemsBySku = new Map<string, OrderLineItem[]>()
    for (const item of order.items) {
      if (!item.variant_sku) {
        continue
      }
      const list = itemsBySku.get(item.variant_sku) ?? []
      list.push(item)
      itemsBySku.set(item.variant_sku, list)
    }

    return requestedItems.map((requested) => {
      const matches = itemsBySku.get(requested.sku) ?? []
      if (matches.length === 0) {
        throw new Error(
          `SKU '${requested.sku}' was not found in order '${order.id}'`
        )
      }
      if (matches.length > 1) {
        throw new Error(
          `SKU '${requested.sku}' matches multiple order items in order '${order.id}'`
        )
      }
      return {
        id: matches[0].id,
        quantity: requested.quantity,
      }
    })
  }

  async createFulfillmentAndShipment({
    createdBy,
    items,
    order,
    shipment,
  }: {
    createdBy?: string
    items: ResolvedTrackingItems
    order: ExistingOrder
    shipment: TrackingShipmentInput
  }): Promise<TrackingApplyResult> {
    const metadata = {
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
    }
    const noNotification = shipment.send_notification === false
    const fulfillment = await createOrderFulfillmentWorkflow(
      this.container
    ).run({
      input: {
        order_id: order.id,
        created_by: createdBy,
        items,
        no_notification: noNotification,
        metadata,
      },
    })
    const fulfillmentId = fulfillment.result.id
    const trackingUrl = shipment.tracking_url ?? ""

    await createOrderShipmentWorkflow(this.container).run({
      input: {
        order_id: order.id,
        fulfillment_id: fulfillmentId,
        created_by: createdBy,
        items,
        no_notification: noNotification,
        labels: [
          {
            tracking_number: shipment.tracking_number,
            tracking_url: trackingUrl,
            label_url: trackingUrl,
          },
        ],
        metadata,
      },
    })

    return {
      fulfillmentId,
      shipmentId: fulfillmentId,
      notificationSent: !noNotification,
    }
  }

  private buildOrderCache(orders: ExistingOrder[]): TrackingOrderCache {
    const cache: TrackingOrderCache = {
      byId: new Map(),
      byDisplayId: new Map(),
      byErpId: new Map(),
    }

    for (const order of orders) {
      cache.byId.set(order.id, order)
      cache.byDisplayId.set(String(order.display_id), order)
      const erpId = stringMetadataValue(order.metadata, "erp_id")
      if (erpId) {
        cache.byErpId.set(erpId, order)
      }
    }

    return cache
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
    values: Set<string>
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
