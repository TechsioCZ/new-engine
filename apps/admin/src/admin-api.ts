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
  AdminEmailLogDetailResponse,
  AdminEmailLogsResponse,
  AdminProductsResponse,
  MedusaAdminCustomer,
  MedusaAdminCustomersResponse,
  MedusaAdminEmailLogsResponse,
  MedusaAdminOrder,
  MedusaAdminOrdersResponse,
  MedusaAdminProduct,
  MedusaAdminProductsResponse,
  MedusaPacketaLabelOrdersResponse,
  PacketaConfigInput,
  PacketaConfigResponse,
  PacketaLabelOrdersResponse,
  PendingB2BCustomersResponse,
  QrPaymentConfigInput,
  QrPaymentConfigResponse,
} from "./admin-types"

const ADMIN_API_PAGE_SIZE = 100
const ADMIN_API_SCAN_LIMIT = 2000
const ACTION_REQUIRED_LIST_LIMIT = 50
const EMAIL_LOG_LIST_LIMIT = 20
const PACKETA_LABEL_ORDER_LIST_LIMIT = 50
const PRODUCT_LIST_LIMIT = 20

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

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "status",
  "*collection",
  "*sales_channels",
  "variants.id",
  "thumbnail",
  "-type",
  "-options",
  "-tags",
  "-images",
  "-variants",
].join(",")

const PACKETA_LABEL_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "fulfillment_status",
  "fulfillments.id",
  "fulfillments.provider_id",
  "fulfillments.canceled_at",
  "fulfillments.data",
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

async function postAdminApi<TResponse>(
  path: string,
  body: unknown
): Promise<TResponse> {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  })
  const token = getStoredAdminToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(buildMedusaUrl(path), {
    body: JSON.stringify(body),
    credentials: "include",
    headers,
    method: "POST",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: unknown
    } | null
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Admin API request failed with ${response.status}`

    throw createApiError(message, response.status)
  }

  return response.json() as Promise<TResponse>
}

async function fetchAdminBlob(
  path: string,
  options: {
    body?: unknown
    method?: "GET" | "POST"
    params?: Record<string, string>
  } = {}
): Promise<Blob> {
  const headers = new Headers({
    Accept: "application/pdf",
  })
  const token = getStoredAdminToken()

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  if (typeof options.body !== "undefined") {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(buildMedusaUrl(path, options.params), {
    body:
      typeof options.body === "undefined"
        ? undefined
        : JSON.stringify(options.body),
    credentials: "include",
    headers,
    method: options.method ?? "GET",
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: unknown
    } | null
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : `Admin API request failed with ${response.status}`

    throw createApiError(message, response.status)
  }

  return response.blob()
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

async function fetchProductsFromAdminApi({
  offset,
  q,
}: {
  offset: number
  q?: string
}): Promise<AdminProductsResponse> {
  const response = await fetchAdminApi<MedusaAdminProductsResponse>(
    "/admin/products",
    {
      fields: PRODUCT_FIELDS,
      is_giftcard: "false",
      limit: String(PRODUCT_LIST_LIMIT),
      offset: String(offset),
      order: "-created_at",
      ...(q ? { q } : {}),
    }
  )

  return {
    count: response.count,
    has_next: response.offset + response.limit < response.count,
    has_previous: response.offset > 0,
    limit: response.limit,
    offset: response.offset,
    products: response.products.map(toProductListItem),
  }
}

async function fetchEmailLogsFromAdminApi({
  offset,
}: {
  offset: number
}): Promise<AdminEmailLogsResponse> {
  const response = await fetchAdminApi<MedusaAdminEmailLogsResponse>(
    "/admin/email-logs",
    {
      limit: String(EMAIL_LOG_LIST_LIMIT),
      offset: String(offset),
    }
  )

  return {
    count: response.count,
    email_logs: response.email_logs,
    has_next: response.offset + response.limit < response.count,
    has_previous: response.offset > 0,
    limit: response.limit,
    offset: response.offset,
  }
}

function fetchEmailLogDetailFromAdminApi(
  id: string
): Promise<AdminEmailLogDetailResponse> {
  return fetchAdminApi<AdminEmailLogDetailResponse>(`/admin/email-logs/${id}`)
}

async function fetchPacketaLabelOrdersFromAdminApi({
  offset,
}: {
  offset: number
}): Promise<PacketaLabelOrdersResponse> {
  const response = await fetchAdminApi<MedusaPacketaLabelOrdersResponse>(
    "/admin/orders",
    {
      fields: PACKETA_LABEL_ORDER_FIELDS,
      limit: String(PACKETA_LABEL_ORDER_LIST_LIMIT),
      offset: String(offset),
      order: "-created_at",
    }
  )

  return {
    count: response.count,
    has_next: response.offset + response.limit < response.count,
    has_previous: response.offset > 0,
    limit: response.limit,
    offset: response.offset,
    orders: response.orders.map((order) => ({
      ...order,
      fulfillments: order.fulfillments ?? [],
    })),
  }
}

export function downloadPacketaLabels({
  labelFormat,
  labelOffset,
  orderIds,
}: {
  labelFormat: "A6" | "A7"
  labelOffset?: number
  orderIds: string[]
}) {
  return fetchAdminBlob("/admin/packeta-labels", {
    body: {
      label_format: labelFormat,
      ...(typeof labelOffset === "number" ? { label_offset: labelOffset } : {}),
      order_ids: orderIds,
    },
    method: "POST",
  })
}

function fetchQrPaymentConfigFromAdminApi(): Promise<QrPaymentConfigResponse> {
  return fetchAdminApi<QrPaymentConfigResponse>("/admin/qr-payment-config")
}

function fetchPacketaConfigFromAdminApi(): Promise<PacketaConfigResponse> {
  return fetchAdminApi<PacketaConfigResponse>("/admin/packeta-config")
}

export function updateQrPaymentConfig(input: QrPaymentConfigInput) {
  return postAdminApi<QrPaymentConfigResponse>(
    "/admin/qr-payment-config",
    input
  )
}

export function updatePacketaConfig(input: PacketaConfigInput) {
  return postAdminApi<PacketaConfigResponse>("/admin/packeta-config", input)
}

function toProductListItem(product: MedusaAdminProduct) {
  return {
    collection_title: product.collection?.title ?? null,
    handle: product.handle ?? null,
    id: product.id,
    sales_channel_count: product.sales_channels?.length ?? 0,
    status: product.status ?? null,
    thumbnail: product.thumbnail ?? null,
    title: product.title ?? product.id,
    variant_count: product.variants?.length ?? 0,
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

export function useAdminProducts({
  offset,
  q,
}: {
  offset: number
  q?: string
}) {
  return useQuery({
    queryFn: () => fetchProductsFromAdminApi({ offset, q }),
    queryKey: [
      "admin-products",
      MEDUSA_BACKEND_URL,
      { limit: PRODUCT_LIST_LIMIT, offset, q },
    ],
  })
}

export function useAdminEmailLogs({ offset }: { offset: number }) {
  return useQuery({
    queryFn: () => fetchEmailLogsFromAdminApi({ offset }),
    queryKey: [
      "admin-email-logs",
      MEDUSA_BACKEND_URL,
      { limit: EMAIL_LOG_LIST_LIMIT, offset },
    ],
  })
}

export function useAdminEmailLogDetail({
  id,
}: {
  id: string | null | undefined
}) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchEmailLogDetailFromAdminApi(id as string),
    queryKey: ["admin-email-log-detail", MEDUSA_BACKEND_URL, id],
  })
}

export function usePacketaLabelOrders({ offset }: { offset: number }) {
  return useQuery({
    queryFn: () => fetchPacketaLabelOrdersFromAdminApi({ offset }),
    queryKey: [
      "packeta-label-orders",
      MEDUSA_BACKEND_URL,
      { limit: PACKETA_LABEL_ORDER_LIST_LIMIT, offset },
    ],
  })
}

export function useQrPaymentConfig() {
  return useQuery({
    queryFn: fetchQrPaymentConfigFromAdminApi,
    queryKey: ["qr-payment-config", MEDUSA_BACKEND_URL],
  })
}

export function usePacketaConfig() {
  return useQuery({
    queryFn: fetchPacketaConfigFromAdminApi,
    queryKey: ["packeta-config", MEDUSA_BACKEND_URL],
  })
}

export {
  EMAIL_LOG_LIST_LIMIT,
  PACKETA_LABEL_ORDER_LIST_LIMIT,
  PRODUCT_LIST_LIMIT,
}
