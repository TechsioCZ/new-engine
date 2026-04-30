import type { TrackingItemInput, TrackingShipmentInput } from "../types"
import type {
  ExistingOrder,
  OrderLineItem,
  ResolvedTrackingItems,
  TrackingOrderIndex,
} from "./client"

type Metadata = Record<string, unknown>

export type TrackingOrderLookupKeys = {
  orderIds: Set<string>
  displayIds: Set<number>
  erpIds: Set<string>
}

export class TrackingBatchClientMapperHelper {
  collectOrderLookupKeys(
    shipments: TrackingShipmentInput[]
  ): TrackingOrderLookupKeys {
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

    return { orderIds, displayIds, erpIds }
  }

  buildOrderIndex(orders: ExistingOrder[]): TrackingOrderIndex {
    const index: TrackingOrderIndex = {
      byId: new Map(),
      byDisplayId: new Map(),
      byErpId: new Map(),
    }

    for (const order of orders) {
      index.byId.set(order.id, order)
      index.byDisplayId.set(String(order.display_id), order)
      const erpId = this.stringMetadataValue(order.metadata, "erp_id")
      if (erpId) {
        index.byErpId.set(erpId, order)
      }
    }

    return index
  }

  findExistingOrder(
    shipment: TrackingShipmentInput,
    index: TrackingOrderIndex
  ): ExistingOrder | null {
    if (shipment.identifier_type === "order_id" && shipment.order_id) {
      return index.byId.get(shipment.order_id) ?? null
    }
    if (shipment.identifier_type === "display_id" && shipment.display_id) {
      return index.byDisplayId.get(shipment.display_id) ?? null
    }
    if (shipment.identifier_type === "erp_id" && shipment.erp_id) {
      return index.byErpId.get(shipment.erp_id) ?? null
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

    const itemsBySku = this.buildItemsBySku(order.items)
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

  buildShipmentMetadata(shipment: TrackingShipmentInput) {
    return {
      carrier: shipment.carrier,
      tracking_number: shipment.tracking_number,
      tracking_url: shipment.tracking_url,
    }
  }

  getOrderIdentifier(shipment: TrackingShipmentInput) {
    if (shipment.identifier_type === "display_id") {
      return shipment.display_id ?? ""
    }
    if (shipment.identifier_type === "order_id") {
      return shipment.order_id ?? ""
    }
    return shipment.erp_id ?? ""
  }

  private buildItemsBySku(items: OrderLineItem[]) {
    const itemsBySku = new Map<string, OrderLineItem[]>()
    for (const item of items) {
      if (!item.variant_sku) {
        continue
      }
      const list = itemsBySku.get(item.variant_sku) ?? []
      list.push(item)
      itemsBySku.set(item.variant_sku, list)
    }
    return itemsBySku
  }

  private stringMetadataValue(
    metadata: Metadata | null | undefined,
    key: string
  ) {
    const value = metadata?.[key]
    return typeof value === "string" && value.length ? value : null
  }
}

export const trackingBatchClientMapperHelper =
  new TrackingBatchClientMapperHelper()
