import type { AdminOrderResponse } from "@medusajs/framework/types"

import { sdk } from "../../lib/sdk"
import type {
  OrderDashboardBusinessStatusGroupId,
  OrderDashboardBusinessStatusId,
  OrderDashboardCarrierKey,
  OrderDashboardFulfillmentCreateItem,
  OrderDashboardFulfillmentOrder,
  OrderDashboardLabelFormat,
  OrderDashboardManualStatusId,
  OrderDashboardManualStatusResponse,
  OrderDashboardOrdersResponse,
  OrderDashboardPacketaEligibilityOrder,
  OrderDashboardShippingOption,
  OrderDashboardStatusResponse,
  OrderDashboardStockLocation,
  OrderDashboardSummaryResponse,
  OrderDashboardTargetStatus,
} from "./types"

const CONTENT_DISPOSITION_FILENAME_REGEX = /filename="?(?<filename>[^";]+)"?/iu
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
const ORDER_DASHBOARD_STOCK_LOCATION_PAGE_LIMIT = 100
const ORDER_DASHBOARD_SHIPPING_OPTION_PAGE_LIMIT = 100

interface ListOrderDashboardOrdersInput {
  businessStatusGroup?: OrderDashboardBusinessStatusGroupId
  businessStatus?: OrderDashboardBusinessStatusId
  carrier?: OrderDashboardCarrierKey
  limit: number
  offset: number
}

type OrderDashboardListedOrder = Awaited<
  ReturnType<typeof sdk.admin.order.list>
>["orders"][number]

const getResponseFilename = (
  response: Response,
  fallbackFilename: string,
): string => {
  const contentDisposition = response.headers.get("content-disposition")

  if (contentDisposition === null || contentDisposition === "") {
    return fallbackFilename
  }

  const match = CONTENT_DISPOSITION_FILENAME_REGEX.exec(contentDisposition)
  return match?.groups?.["filename"] ?? fallbackFilename
}

type OrderDashboardPdfBody =
  | { order_ids: string[] }
  | {
      label_format: OrderDashboardLabelFormat
      label_offset?: number
      order_ids: string[]
    }

const downloadPdf = async (
  path: string,
  body: OrderDashboardPdfBody,
  fallbackFilename: string,
): Promise<void> => {
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
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const isOrderDashboardPacketaEligibilityOrder = (
  order: OrderDashboardListedOrder,
): order is OrderDashboardListedOrder & OrderDashboardPacketaEligibilityOrder =>
  typeof order.id === "string"

const fetchOrderDashboardStockLocationsPage = async (
  offset: number,
  collected: OrderDashboardStockLocation[],
): Promise<OrderDashboardStockLocation[]> => {
  const response = await sdk.admin.stockLocation.list({
    fields: "id,name",
    limit: ORDER_DASHBOARD_STOCK_LOCATION_PAGE_LIMIT,
    offset,
  })

  const page = response.stock_locations as OrderDashboardStockLocation[]
  const collectedPage = [...collected, ...page]

  if (page.length < ORDER_DASHBOARD_STOCK_LOCATION_PAGE_LIMIT) {
    return collectedPage
  }

  return await fetchOrderDashboardStockLocationsPage(
    offset + ORDER_DASHBOARD_STOCK_LOCATION_PAGE_LIMIT,
    collectedPage,
  )
}

const fetchOrderDashboardShippingOptionsPage = async (
  stockLocationId: string,
  offset: number,
  collected: OrderDashboardShippingOption[],
): Promise<OrderDashboardShippingOption[]> => {
  const response = await sdk.admin.shippingOption.list({
    fields: FULFILLMENT_SHIPPING_OPTION_FIELDS,
    limit: ORDER_DASHBOARD_SHIPPING_OPTION_PAGE_LIMIT,
    offset,
    stock_location_id: stockLocationId,
  })

  const page = response.shipping_options as OrderDashboardShippingOption[]
  const collectedPage = [...collected, ...page]

  if (page.length < ORDER_DASHBOARD_SHIPPING_OPTION_PAGE_LIMIT) {
    return collectedPage
  }

  return await fetchOrderDashboardShippingOptionsPage(
    stockLocationId,
    offset + ORDER_DASHBOARD_SHIPPING_OPTION_PAGE_LIMIT,
    collectedPage,
  )
}

export const listOrderDashboardOrders = async ({
  businessStatusGroup,
  businessStatus,
  carrier,
  limit,
  offset,
}: ListOrderDashboardOrdersInput): Promise<OrderDashboardOrdersResponse> =>
  await sdk.client.fetch<OrderDashboardOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      query: {
        business_status: businessStatus,
        business_status_group: businessStatusGroup,
        carrier,
        limit,
        offset,
      },
    },
  )

export const getOrderDashboardSummary =
  async (): Promise<OrderDashboardSummaryResponse> =>
    await sdk.client.fetch<OrderDashboardSummaryResponse>(
      "/admin/order-expedition/summary",
    )

export const updateOrderDashboardStatuses = async (input: {
  orderIds: string[]
  targetStatus: OrderDashboardTargetStatus
}): Promise<OrderDashboardStatusResponse> =>
  await sdk.client.fetch<OrderDashboardStatusResponse>(
    "/admin/order-expedition/status",
    {
      body: {
        order_ids: input.orderIds,
        target_status: input.targetStatus,
      },
      method: "POST",
    },
  )

export const updateOrderDashboardManualStatus = async (input: {
  orderIds: string[]
  status: OrderDashboardManualStatusId | null
}): Promise<OrderDashboardManualStatusResponse> =>
  await sdk.client.fetch<OrderDashboardManualStatusResponse>(
    "/admin/order-business-statuses/bulk",
    {
      body: {
        order_ids: input.orderIds,
        status: input.status,
      },
      method: "POST",
    },
  )

export const downloadOrderDashboardExpeditionPdf = async (
  orderIds: string[],
): Promise<void> => {
  await downloadPdf(
    "/admin/order-expedition/pdf",
    {
      order_ids: orderIds,
    },
    `expedition-orders-${new Date().toISOString().slice(0, 10)}.pdf`,
  )
}

export const downloadOrderDashboardPacketaLabels = async (input: {
  labelFormat: OrderDashboardLabelFormat
  labelOffset?: number
  orderIds: string[]
}): Promise<void> => {
  await downloadPdf(
    "/admin/packeta-labels",
    {
      label_format: input.labelFormat,
      label_offset: input.labelOffset,
      order_ids: input.orderIds,
    },
    `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`,
  )
}

export const listOrderDashboardPacketaEligibility = async (
  orderIds: string[],
): Promise<OrderDashboardPacketaEligibilityOrder[]> => {
  if (!orderIds.length) {
    return []
  }

  const response = await sdk.admin.order.list({
    fields: PACKETA_ELIGIBILITY_ORDER_FIELDS,
    id: orderIds,
    limit: orderIds.length,
    offset: 0,
  })

  return response.orders.filter(isOrderDashboardPacketaEligibilityOrder)
}

export const listOrderDashboardFulfillmentOrders = async (
  orderIds: string[],
): Promise<OrderDashboardFulfillmentOrder[]> => {
  if (!orderIds.length) {
    return []
  }

  const response = await sdk.admin.order.list({
    fields: FULFILLMENT_ORDER_FIELDS,
    id: orderIds,
    limit: orderIds.length,
    offset: 0,
  })

  return response.orders
}

export const listOrderDashboardStockLocations = async (): Promise<
  OrderDashboardStockLocation[]
> => await fetchOrderDashboardStockLocationsPage(0, [])

export const listOrderDashboardShippingOptions = async (
  stockLocationId: string,
): Promise<OrderDashboardShippingOption[]> => {
  if (!stockLocationId) {
    return []
  }

  return await fetchOrderDashboardShippingOptionsPage(stockLocationId, 0, [])
}

export const createOrderDashboardFulfillment = async (input: {
  items: OrderDashboardFulfillmentCreateItem[]
  locationId: string
  noNotification: boolean
  orderId: string
  shippingOptionId?: string
}): Promise<AdminOrderResponse> =>
  await sdk.admin.order.createFulfillment(input.orderId, {
    items: input.items,
    location_id: input.locationId,
    metadata: {},
    no_notification: input.noNotification,
    ...(input.shippingOptionId === undefined
      ? {}
      : { shipping_option_id: input.shippingOptionId }),
  })
