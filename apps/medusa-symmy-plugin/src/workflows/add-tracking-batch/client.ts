import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createOrderFulfillmentWorkflow,
  createOrderShipmentWorkflow,
} from "@medusajs/medusa/core-flows"

import { trackingBatchClientMapperHelper } from "./client-mapper-helper"
import type { TrackingOrderLookupKeys } from "./client-mapper-helper"
import type { TrackingItemInput, TrackingShipmentInput } from "./types"

type Metadata = Record<string, unknown>

export interface OrderLineItem {
  id: string
  quantity: number
  variant_sku?: string | null
}

export interface ExistingOrder {
  id: string
  display_id: number
  metadata: Metadata | null
  items: OrderLineItem[]
}

export interface TrackingOrderIndex {
  byId: Map<string, ExistingOrder>
  byDisplayId: Map<string, ExistingOrder>
  byErpId: Map<string, ExistingOrder>
}

export type ResolvedTrackingItems = {
  id: string
  quantity: number
}[]

export interface TrackingApplyResult {
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

export class TrackingBatchClient {
  private readonly container: MedusaContainer
  private readonly query: Query
  private readonly mapper = trackingBatchClientMapperHelper

  constructor(container: MedusaContainer) {
    this.container = container
    this.query = getQuery(container)
  }

  async preload(
    shipments: TrackingShipmentInput[],
  ): Promise<TrackingOrderIndex> {
    const { orderIds, displayIds, erpIds } =
      this.mapper.collectOrderLookupKeys(shipments)
    const metadataOrderIds = await this.queryOrderIdsByMetadata(
      "erp_id",
      erpIds,
    )
    const [byIdOrders, byDisplayIdOrders, scannedOrders] = await Promise.all([
      this.queryOrders({ id: [...orderIds] }),
      this.queryOrders({ display_id: [...displayIds] }),
      this.queryOrders({ id: [...metadataOrderIds] }),
    ])

    return this.mapper.buildOrderIndex([
      ...byIdOrders,
      ...byDisplayIdOrders,
      ...scannedOrders,
    ])
  }

  findExistingOrder(
    shipment: TrackingShipmentInput,
    index: TrackingOrderIndex,
  ): ExistingOrder | null {
    return this.mapper.findExistingOrder(shipment, index)
  }

  resolveItems(
    order: ExistingOrder,
    requestedItems: TrackingItemInput[] | undefined,
  ): ResolvedTrackingItems {
    return this.mapper.resolveItems(order, requestedItems)
  }

  async createFulfillmentAndShipment({
    createdBy,
    items,
    order,
    shipment,
  }: {
    createdBy?: string | undefined
    items: ResolvedTrackingItems
    order: ExistingOrder
    shipment: TrackingShipmentInput
  }): Promise<TrackingApplyResult> {
    const metadata = this.mapper.buildShipmentMetadata(shipment)
    const noNotification = shipment.send_notification === false
    const fulfillment = await createOrderFulfillmentWorkflow(
      this.container,
    ).run({
      input: {
        order_id: order.id,
        ...(createdBy === undefined ? {} : { created_by: createdBy }),
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
        ...(createdBy === undefined ? {} : { created_by: createdBy }),
        items,
        no_notification: noNotification,
        labels: [
          {
            label_url: trackingUrl,
            tracking_number: shipment.tracking_number,
            tracking_url: trackingUrl,
          },
        ],
        metadata,
      },
    })

    return {
      fulfillmentId,
      notificationSent: !noNotification,
      shipmentId: fulfillmentId,
    }
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
    values: TrackingOrderLookupKeys["erpIds"],
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
