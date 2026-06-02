import { sdk } from "../../lib/sdk"
import type {
  OrderDashboardBusinessStatusId,
  OrderDashboardCarrierKey,
  OrderDashboardLabelFormat,
  OrderDashboardManualStatusId,
  OrderDashboardManualStatusResponse,
  OrderDashboardOrdersResponse,
  OrderDashboardStatusResponse,
  OrderDashboardTargetStatus,
} from "./types"

const CONTENT_DISPOSITION_FILENAME_REGEX = /filename="?([^";]+)"?/i

type ListOrderDashboardOrdersInput = {
  businessStatus?: OrderDashboardBusinessStatusId
  carrier?: OrderDashboardCarrierKey
  limit: number
  offset: number
}

export function listOrderDashboardOrders({
  businessStatus,
  carrier,
  limit,
  offset,
}: ListOrderDashboardOrdersInput) {
  return sdk.client.fetch<OrderDashboardOrdersResponse>(
    "/admin/order-expedition/orders",
    {
      query: {
        business_status: businessStatus,
        carrier,
        limit,
        offset,
      },
    }
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
