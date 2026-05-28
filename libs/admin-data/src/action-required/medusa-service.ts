import type { AdminDataClient } from "../shared/admin-client"
import {
  isActionRequiredOrder,
  isPendingB2BCustomer,
  toActionRequiredOrder,
  toPendingB2BCustomer,
} from "./rules"
import { toActionRequiredSummary } from "./summary"
import type {
  ActionRequiredListParams,
  ActionRequiredOrdersResponse,
  ActionRequiredService,
  ActionRequiredSummary,
  MedusaAdminCustomer,
  MedusaAdminCustomersResponse,
  MedusaAdminOrder,
  MedusaAdminOrdersResponse,
  PendingB2BCustomersResponse,
} from "./types"

export const ACTION_REQUIRED_DEFAULT_LIST_LIMIT = 50
export const ACTION_REQUIRED_DEFAULT_LIST_OFFSET = 0

const ADMIN_API_PAGE_SIZE = 100
const ADMIN_API_SCAN_CONCURRENCY = 2
const ADMIN_API_SCAN_LIMIT = 2000

const ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "status",
  "metadata",
  "payment_status",
  "payment_collections.status",
  "fulfillment_status",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
].join(",")

const CUSTOMER_FIELDS = [
  "id",
  "email",
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "created_at",
  "metadata",
].join(",")

type FetchAllAdminPagesInput<TResponse, TItem> = {
  client: AdminDataClient
  params?: Record<string, string>
  path: string
  readItems: (response: TResponse) => TItem[]
  signal?: AbortSignal
}

function getAdminPageOffsets(recordCount: number) {
  const offsets: number[] = []

  for (let offset = 0; offset < recordCount; offset += ADMIN_API_PAGE_SIZE) {
    offsets.push(offset)
  }

  return offsets
}

async function fetchAllAdminPages<TResponse extends { count: number }, TItem>({
  client,
  params,
  path,
  readItems,
  signal,
}: FetchAllAdminPagesInput<TResponse, TItem>) {
  const fetchPage = (offset: number) =>
    client.fetchJson<TResponse>(path, {
      params: {
        ...params,
        limit: String(ADMIN_API_PAGE_SIZE),
        offset: String(offset),
      },
      signal,
    })
  const firstResponse = await fetchPage(0)
  const records = [...readItems(firstResponse)]
  const scanRecordCount = Math.min(firstResponse.count, ADMIN_API_SCAN_LIMIT)

  if (!records.length || records.length >= scanRecordCount) {
    return {
      countExact: firstResponse.count <= ADMIN_API_SCAN_LIMIT,
      records,
    }
  }

  const remainingOffsets = getAdminPageOffsets(scanRecordCount).slice(1)

  for (
    let index = 0;
    index < remainingOffsets.length;
    index += ADMIN_API_SCAN_CONCURRENCY
  ) {
    const offsetBatch = remainingOffsets.slice(
      index,
      index + ADMIN_API_SCAN_CONCURRENCY
    )
    const pages = await Promise.all(
      offsetBatch.map((offset) => fetchPage(offset))
    )

    for (const response of pages) {
      records.push(...readItems(response))
    }
  }

  return {
    countExact: firstResponse.count <= ADMIN_API_SCAN_LIMIT,
    records,
  }
}

function paginateRecords<TRecord>(
  records: TRecord[],
  params: ActionRequiredListParams
) {
  return records.slice(params.offset, params.offset + params.limit)
}

export function createMedusaActionRequiredService(
  client: AdminDataClient
): ActionRequiredService {
  async function getOrders(
    params: ActionRequiredListParams,
    signal?: AbortSignal
  ): Promise<ActionRequiredOrdersResponse> {
    const result = await fetchAllAdminPages<
      MedusaAdminOrdersResponse,
      MedusaAdminOrder
    >({
      client,
      params: {
        fields: ORDER_FIELDS,
        order: "-created_at",
        status: "pending",
      },
      path: "/admin/orders",
      readItems: (response) => response.orders,
      signal,
    })
    const orders = result.records
      .filter(isActionRequiredOrder)
      .map(toActionRequiredOrder)

    return {
      count: orders.length,
      count_exact: result.countExact,
      has_next:
        !result.countExact || params.offset + params.limit < orders.length,
      limit: params.limit,
      offset: params.offset,
      orders: paginateRecords(orders, params),
    }
  }

  async function getCustomers(
    params: ActionRequiredListParams,
    signal?: AbortSignal
  ): Promise<PendingB2BCustomersResponse> {
    const result = await fetchAllAdminPages<
      MedusaAdminCustomersResponse,
      MedusaAdminCustomer
    >({
      client,
      params: {
        fields: CUSTOMER_FIELDS,
        order: "-created_at",
      },
      path: "/admin/customers",
      readItems: (response) => response.customers,
      signal,
    })
    const customers = result.records
      .filter(isPendingB2BCustomer)
      .map(toPendingB2BCustomer)

    return {
      count: customers.length,
      count_exact: result.countExact,
      customers: paginateRecords(customers, params),
      has_next:
        !result.countExact || params.offset + params.limit < customers.length,
      limit: params.limit,
      offset: params.offset,
    }
  }

  async function getSummary(
    _params: Record<string, never>,
    signal?: AbortSignal
  ): Promise<ActionRequiredSummary> {
    const params = {
      limit: ACTION_REQUIRED_DEFAULT_LIST_LIMIT,
      offset: ACTION_REQUIRED_DEFAULT_LIST_OFFSET,
    }
    const [ordersResult, customersResult] = await Promise.allSettled([
      getOrders(params, signal),
      getCustomers(params, signal),
    ])

    return toActionRequiredSummary(ordersResult, customersResult)
  }

  return {
    getCustomers,
    getOrders,
    getSummary,
  }
}
