import { useQuery } from "@tanstack/react-query"
import { getStoredAdminToken } from "./admin-auth"
import { buildMedusaUrl, MEDUSA_BACKEND_URL } from "./admin-config"
import { createApiError } from "./admin-errors"
import {
  isActionRequiredOrder,
  isPendingB2BCustomer,
  toActionRequiredOrder,
  toPendingB2BCustomer,
} from "./admin-rules"
import type {
  ActionRequiredOrdersResponse,
  ActionRequiredSummary,
  MedusaAdminCustomer,
  MedusaAdminCustomersResponse,
  MedusaAdminOrder,
  MedusaAdminOrdersResponse,
  PendingB2BCustomersResponse,
} from "./admin-types"

const ADMIN_API_PAGE_SIZE = 100
const ADMIN_API_SCAN_LIMIT = 2000
const ACTION_REQUIRED_LIST_LIMIT = 50

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
  params?: Record<string, string>
  path: string
  readItems: (response: TResponse) => TItem[]
}

async function fetchAdminApi<TResponse>(
  path: string,
  params?: Record<string, string>
): Promise<TResponse> {
  const headers = new Headers({
    Accept: "application/json",
  })
  const token = getStoredAdminToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(buildMedusaUrl(path, params), {
    credentials: "include",
    headers,
  })

  if (!response.ok) {
    throw createApiError(
      `Admin API request failed with ${response.status}`,
      response.status
    )
  }

  return response.json() as Promise<TResponse>
}

async function fetchAllAdminPages<TResponse extends { count: number }, TItem>({
  params,
  path,
  readItems,
}: FetchAllAdminPagesInput<TResponse, TItem>) {
  const records: TItem[] = []
  let offset = 0

  while (records.length < ADMIN_API_SCAN_LIMIT) {
    const response = await fetchAdminApi<TResponse>(path, {
      ...params,
      limit: String(ADMIN_API_PAGE_SIZE),
      offset: String(offset),
    })
    const pageRecords = readItems(response)

    records.push(...pageRecords)
    offset += pageRecords.length

    if (!pageRecords.length || offset >= response.count) {
      return {
        countExact: true,
        records,
      }
    }
  }

  return {
    countExact: false,
    records,
  }
}

async function fetchActionRequiredOrdersFromAdminApi(): Promise<ActionRequiredOrdersResponse> {
  const result = await fetchAllAdminPages<
    MedusaAdminOrdersResponse,
    MedusaAdminOrder
  >({
    params: {
      fields: ORDER_FIELDS,
      order: "-created_at",
      status: "pending",
    },
    path: "/admin/orders",
    readItems: (response) => response.orders,
  })
  const orders = result.records
    .filter(isActionRequiredOrder)
    .map(toActionRequiredOrder)

  return {
    count: orders.length,
    count_exact: result.countExact,
    has_next: orders.length > ACTION_REQUIRED_LIST_LIMIT,
    limit: ACTION_REQUIRED_LIST_LIMIT,
    offset: 0,
    orders: orders.slice(0, ACTION_REQUIRED_LIST_LIMIT),
  }
}

async function fetchPendingB2BCustomersFromAdminApi(): Promise<PendingB2BCustomersResponse> {
  const result = await fetchAllAdminPages<
    MedusaAdminCustomersResponse,
    MedusaAdminCustomer
  >({
    params: {
      fields: CUSTOMER_FIELDS,
      order: "-created_at",
    },
    path: "/admin/customers",
    readItems: (response) => response.customers,
  })
  const customers = result.records
    .filter(isPendingB2BCustomer)
    .map(toPendingB2BCustomer)

  return {
    count: customers.length,
    count_exact: result.countExact,
    customers: customers.slice(0, ACTION_REQUIRED_LIST_LIMIT),
    has_next: customers.length > ACTION_REQUIRED_LIST_LIMIT,
    limit: ACTION_REQUIRED_LIST_LIMIT,
    offset: 0,
  }
}

export function useActionRequiredSummary({
  enabled = true,
}: {
  enabled?: boolean
} = {}) {
  return useQuery({
    enabled,
    queryFn: async (): Promise<ActionRequiredSummary> => {
      const [orders, customers] = await Promise.all([
        fetchActionRequiredOrdersFromAdminApi(),
        fetchPendingB2BCustomersFromAdminApi(),
      ])

      return {
        orders: { count: orders.count },
        customers: { count: customers.count },
      }
    },
    queryKey: ["action-required-summary", MEDUSA_BACKEND_URL],
  })
}

export function useActionRequiredOrders() {
  return useQuery({
    queryFn: fetchActionRequiredOrdersFromAdminApi,
    queryKey: [
      "action-required-orders",
      MEDUSA_BACKEND_URL,
      { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
    ],
  })
}

export function usePendingB2BCustomers() {
  return useQuery({
    queryFn: fetchPendingB2BCustomersFromAdminApi,
    queryKey: [
      "pending-b2b-customers",
      MEDUSA_BACKEND_URL,
      { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
    ],
  })
}
