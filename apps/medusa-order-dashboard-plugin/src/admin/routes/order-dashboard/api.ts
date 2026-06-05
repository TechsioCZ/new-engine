import { sdk } from "../../lib/sdk"
import type {
  OrderDashboardBusinessStatusId,
  OrderDashboardBusinessStatusGroupId,
  OrderDashboardCarrierKey,
  OrderDashboardFulfillmentCreateItem,
  OrderDashboardFulfillmentOrder,
  OrderDashboardLabelFormat,
  OrderDashboardManualStatusId,
  OrderDashboardManualStatusResponse,
  OrderDashboardOrdersResponse,
  OrderDashboardPacketaEligibilityOrder,
  OrderDashboardShippingOption,
  OrderDashboardStockLocation,
  OrderDashboardSummaryResponse,
  OrderDashboardStatusResponse,
  OrderDashboardTargetStatus,
} from "./types"

const CONTENT_DISPOSITION_FILENAME_REGEX = /filename="?([^";]+)"?/i
const PACKETA_ELIGIBILITY_ORDER_FIELDS = [
  "id",
  "display_id",
  "fulfillments.id",
  "fulfillments.provider_id",
  "fulfillments.canceled_at",
  "fulfillments.data",
].join(",")
const FULFILLMENT_ORDER_FIELDS = [
  "id",
  "display_id",
  "status",
  "no_notification",
  "currency_code",
  "*items",
  "*items.variant",
  "+items.variant.product.shipping_profile.id",
  "+shipping_methods.shipping_option_id",
  "shipping_methods.name",
].join(",")
const FULFILLMENT_SHIPPING_OPTION_FIELDS = [
  "id",
  "name",
  "provider_id",
  "shipping_profile_id",
].join(",")

type ListOrderDashboardOrdersInput = {
  businessStatusGroup?: OrderDashboardBusinessStatusGroupId
  businessStatus?: OrderDashboardBusinessStatusId
  carrier?: OrderDashboardCarrierKey
  limit: number
  offset: number
}

export function listOrderDashboardOrders({
  businessStatusGroup,
  businessStatus,
  carrier,
  limit,
  offset,
}: ListOrderDashboardOrdersInput) {
  return sdk.client.fetch<OrderDashboardOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      query: {
        business_status_group: businessStatusGroup,
        business_status: businessStatus,
        carrier,
        limit,
        offset,
      },
    }
  )
}

export function getOrderDashboardSummary() {
  return sdk.client.fetch<OrderDashboardSummaryResponse>(
    "/admin/order-expedition/summary"
  )
}

export function updateOrderDashboardStatuses(input: {
  orderIds: string[]
  targetStatus: OrderDashboardTargetStatus
}) {
  return sdk.client.fetch<OrderDashboardStatusResponse>(
    "/admin/order-expedition/status",
    {
      body: {
        order_ids: input.orderIds,
        target_status: input.targetStatus,
      },
      method: "POST",
    }
  )
}

export function updateOrderDashboardManualStatus(input: {
  orderIds: string[]
  status: OrderDashboardManualStatusId | null
}) {
  return sdk.client.fetch<OrderDashboardManualStatusResponse>(
    "/admin/order-business-statuses/bulk",
    {
      body: {
        order_ids: input.orderIds,
        status: input.status,
      },
      method: "POST",
    }
  )
}

export function downloadOrderDashboardExpeditionPdf(orderIds: string[]) {
  return downloadPdf(
    "/admin/order-expedition/pdf",
    {
      order_ids: orderIds,
    },
    `expedition-orders-${new Date().toISOString().slice(0, 10)}.pdf`
  )
}

export function downloadOrderDashboardPacketaLabels(input: {
  labelFormat: OrderDashboardLabelFormat
  orderIds: string[]
}) {
  return downloadPdf(
    "/admin/packeta-labels",
    {
      label_format: input.labelFormat,
      order_ids: input.orderIds,
    },
    `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
  )
}

export async function listOrderDashboardPacketaEligibility(orderIds: string[]) {
  if (!orderIds.length) {
    return []
  }

  const response = await sdk.admin.order.list({
    fields: PACKETA_ELIGIBILITY_ORDER_FIELDS,
    id: orderIds,
    limit: orderIds.length,
    offset: 0,
  })

  return response.orders as OrderDashboardPacketaEligibilityOrder[]
}

export async function listOrderDashboardFulfillmentOrders(orderIds: string[]) {
  if (!orderIds.length) {
    return []
  }

  const response = await sdk.admin.order.list({
    fields: FULFILLMENT_ORDER_FIELDS,
    id: orderIds,
    limit: orderIds.length,
    offset: 0,
  })

  return response.orders as OrderDashboardFulfillmentOrder[]
}

export async function listOrderDashboardStockLocations() {
  const response = await sdk.admin.stockLocation.list({
    fields: "id,name",
    limit: 100,
    offset: 0,
  })

  return response.stock_locations as OrderDashboardStockLocation[]
}

export async function listOrderDashboardShippingOptions(stockLocationId: string) {
  if (!stockLocationId) {
    return []
  }

  const response = await sdk.admin.shippingOption.list({
    fields: FULFILLMENT_SHIPPING_OPTION_FIELDS,
    limit: 100,
    offset: 0,
    stock_location_id: stockLocationId,
  })

  return response.shipping_options as OrderDashboardShippingOption[]
}

export function createOrderDashboardFulfillment(input: {
  items: OrderDashboardFulfillmentCreateItem[]
  locationId: string
  noNotification: boolean
  orderId: string
  shippingOptionId?: string
}) {
  return sdk.admin.order.createFulfillment(input.orderId, {
    items: input.items,
    location_id: input.locationId,
    metadata: {},
    no_notification: input.noNotification,
    shipping_option_id: input.shippingOptionId,
  })
}

async function downloadPdf(
  path: string,
  body: Record<string, unknown>,
  fallbackFilename: string
) {
  const response = await sdk.client.fetch<Response>(path, {
    body,
    headers: {
      accept: "application/pdf",
    },
    method: "POST",
  })
  const blob = await response.blob()
  const filename = getResponseFilename(response, fallbackFilename)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function getResponseFilename(response: Response, fallbackFilename: string) {
  const contentDisposition = response.headers.get("content-disposition")

  if (!contentDisposition) {
    return fallbackFilename
  }

  const match = CONTENT_DISPOSITION_FILENAME_REGEX.exec(contentDisposition)
  return match?.[1] ?? fallbackFilename
}
