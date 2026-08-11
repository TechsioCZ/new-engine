import type { DataTableDateComparisonOperator } from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import type {
  OrderDashboardBusinessStatusCatalogResponse,
  OrderDashboardBusinessStatusGroupId,
  OrderDashboardBusinessStatusId,
  OrderDashboardCarrierKey,
  OrderDashboardFulfillmentCreateItem,
  OrderDashboardFulfillmentOrder,
  OrderDashboardLabelCarrier,
  OrderDashboardLabelEligibilityOrder,
  OrderDashboardLabelFormat,
  OrderDashboardManualStatusId,
  OrderDashboardManualStatusResponse,
  OrderDashboardOrdersResponse,
  OrderDashboardPdfExportMode,
  OrderDashboardShippingOption,
  OrderDashboardSortOrder,
  OrderDashboardStatusResponse,
  OrderDashboardStockLocation,
  OrderDashboardSummaryResponse,
  OrderDashboardTargetStatus,
} from "./types"

const CONTENT_DISPOSITION_FILENAME_REGEX = /filename="?([^";]+)"?/i
const LABEL_ELIGIBILITY_ORDER_FIELDS = [
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
  "shipping_methods.data",
].join(",")
const FULFILLMENT_SHIPPING_OPTION_FIELDS = [
  "id",
  "name",
  "provider_id",
  "shipping_profile_id",
].join(",")

export type ListOrderDashboardOrdersInput = {
  businessStatusGroup?: OrderDashboardBusinessStatusGroupId
  businessStatus?: OrderDashboardBusinessStatusId
  carrier?: OrderDashboardCarrierKey
  createdAt?: DataTableDateComparisonOperator
  limit: number
  offset: number
  order: OrderDashboardSortOrder
  pendingUnpaid?: boolean
  q?: string
}

export function listOrderDashboardOrders(
  {
    businessStatusGroup,
    businessStatus,
    carrier,
    createdAt,
    limit,
    offset,
    order,
    pendingUnpaid,
    q,
  }: ListOrderDashboardOrdersInput,
  signal?: AbortSignal
) {
  return sdk.client.fetch<OrderDashboardOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      query: {
        business_status_group: businessStatusGroup,
        business_status: businessStatus,
        carrier,
        created_at: createdAt,
        limit,
        offset,
        order,
        pending_unpaid: pendingUnpaid,
        q,
      },
      signal,
    }
  )
}

export function getOrderDashboardSummary() {
  return sdk.client.fetch<OrderDashboardSummaryResponse>(
    "/admin/order-expedition/summary"
  )
}

export function getOrderDashboardBusinessStatusCatalog() {
  return sdk.client.fetch<OrderDashboardBusinessStatusCatalogResponse>(
    "/admin/order-business-statuses/catalog"
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

export function downloadOrderDashboardExpeditionPdf(input: {
  mode: OrderDashboardPdfExportMode
  orderIds: string[]
}) {
  return downloadFile(
    "/admin/order-expedition/pdf",
    {
      mode: input.mode,
      order_ids: input.orderIds,
    },
    input.mode === "separate" ? "objednavky.zip" : "objednavky.pdf",
    "application/pdf, application/zip"
  )
}

export function downloadOrderDashboardPacketaLabels(input: {
  labelFormat: OrderDashboardLabelFormat
  labelOffset?: number
  orderIds: string[]
}) {
  return downloadFile(
    "/admin/packeta-labels",
    {
      label_format: input.labelFormat,
      label_offset: input.labelOffset,
      order_ids: input.orderIds,
    },
    `packeta-labels-${new Date().toISOString().slice(0, 10)}.pdf`
  )
}

export function downloadOrderDashboardGLSLabels(orderIds: string[]) {
  return downloadFile(
    "/admin/gls-labels",
    { order_ids: orderIds },
    `gls-labels-${new Date().toISOString().slice(0, 10)}.pdf`
  )
}

export function downloadOrderDashboardPPLLabels(orderIds: string[]) {
  return downloadFile(
    "/admin/ppl-labels",
    { order_ids: orderIds },
    orderIds.length === 1
      ? `ppl-label-${new Date().toISOString().slice(0, 10)}.png`
      : `ppl-labels-${new Date().toISOString().slice(0, 10)}.zip`,
    "application/pdf, application/zip, image/png, image/jpeg, image/svg+xml"
  )
}

export function downloadOrderDashboardShippingLabels(input: {
  carrier: OrderDashboardLabelCarrier
  labelFormat: OrderDashboardLabelFormat
  labelOffset?: number
  orderIds: string[]
}) {
  switch (input.carrier) {
    case "gls":
      return downloadOrderDashboardGLSLabels(input.orderIds)
    case "packeta":
      return downloadOrderDashboardPacketaLabels(input)
    case "ppl":
      return downloadOrderDashboardPPLLabels(input.orderIds)
    default:
      throw new Error("Unsupported shipping label carrier")
  }
}

export async function listOrderDashboardLabelEligibility(orderIds: string[]) {
  if (!orderIds.length) {
    return []
  }

  const response = await sdk.admin.order.list({
    fields: LABEL_ELIGIBILITY_ORDER_FIELDS,
    id: orderIds,
    limit: orderIds.length,
    offset: 0,
  })

  return response.orders as OrderDashboardLabelEligibilityOrder[]
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
  const limit = 100
  const stockLocations: OrderDashboardStockLocation[] = []

  for (let offset = 0; ; offset += limit) {
    const response = await sdk.admin.stockLocation.list({
      fields: "id,name",
      limit,
      offset,
    })

    const page = response.stock_locations as OrderDashboardStockLocation[]
    stockLocations.push(...page)

    if (page.length < limit) {
      break
    }
  }

  return stockLocations
}

export async function listOrderDashboardShippingOptions(
  stockLocationId: string
) {
  if (!stockLocationId) {
    return []
  }

  const limit = 100
  const shippingOptions: OrderDashboardShippingOption[] = []

  for (let offset = 0; ; offset += limit) {
    const response = await sdk.admin.shippingOption.list({
      fields: FULFILLMENT_SHIPPING_OPTION_FIELDS,
      limit,
      offset,
      stock_location_id: stockLocationId,
    })

    const page = response.shipping_options as OrderDashboardShippingOption[]
    shippingOptions.push(...page)

    if (page.length < limit) {
      break
    }
  }

  return shippingOptions
}

export function createOrderDashboardFulfillment(input: {
  items: OrderDashboardFulfillmentCreateItem[]
  locationId: string
  noNotification: boolean
  orderId: string
  shippingOptionId?: string
}): Promise<unknown> {
  return sdk.admin.order.createFulfillment(input.orderId, {
    items: input.items,
    location_id: input.locationId,
    metadata: {},
    no_notification: input.noNotification,
    shipping_option_id: input.shippingOptionId,
  })
}

async function downloadFile(
  path: string,
  body: Record<string, unknown>,
  fallbackFilename: string,
  accept = "application/pdf"
) {
  const response = await sdk.client.fetch<Response>(path, {
    body,
    headers: {
      accept,
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
