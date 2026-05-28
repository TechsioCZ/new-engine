import type {
  OrderExpeditionCarrierKey,
  OrderExpeditionOrdersResponse,
} from "../../admin-types"

function compareOrderExpeditionOrders(
  left: OrderExpeditionOrdersResponse["orders"][number],
  right: OrderExpeditionOrdersResponse["orders"][number]
) {
  const leftCreatedAt = Date.parse(left.created_at ?? "")
  const rightCreatedAt = Date.parse(right.created_at ?? "")

  if (!(Number.isNaN(leftCreatedAt) || Number.isNaN(rightCreatedAt))) {
    return rightCreatedAt - leftCreatedAt
  }

  return left.id.localeCompare(right.id)
}

function mergeOrderExpeditionOrders(
  responses: OrderExpeditionOrdersResponse[]
) {
  const ordersById = new Map<
    string,
    OrderExpeditionOrdersResponse["orders"][number]
  >()

  for (const response of responses) {
    for (const order of response.orders) {
      ordersById.set(order.id, order)
    }
  }

  return [...ordersById.values()].sort(compareOrderExpeditionOrders)
}

function getScannedCount(responses: OrderExpeditionOrdersResponse[]) {
  if (responses.some((response) => response.scanned_count === null)) {
    return null
  }

  return responses.reduce(
    (total, response) => total + (response.scanned_count ?? 0),
    0
  )
}

export function aggregateOrderExpeditionOrdersResponses({
  carrier,
  limit,
  offset,
  responses,
}: {
  carrier: OrderExpeditionCarrierKey | "all"
  limit: number
  offset: number
  responses: OrderExpeditionOrdersResponse[]
}): OrderExpeditionOrdersResponse {
  const orders = mergeOrderExpeditionOrders(responses)
  const count = responses.reduce((total, response) => total + response.count, 0)
  const countExact = responses.every((response) => response.count_exact)

  return {
    business_status: null,
    carrier: carrier === "all" ? null : carrier,
    carrier_filter_limit_reached: responses.some(
      (response) => response.carrier_filter_limit_reached
    ),
    count,
    count_exact: countExact,
    has_next: !countExact || offset + limit < count,
    limit,
    offset,
    orders: orders.slice(offset, offset + limit),
    scanned_count: getScannedCount(responses),
  }
}
