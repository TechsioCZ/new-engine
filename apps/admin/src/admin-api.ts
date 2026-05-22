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
  AdminCustomerGroupsResponse,
  AdminCustomerOrdersResponse,
  AdminEmailLogDetailResponse,
  AdminEmailLogsResponse,
  AdminProductsResponse,
  MedusaAdminCustomer,
  MedusaAdminCustomerGroupsResponse,
  MedusaAdminCustomerResponse,
  MedusaAdminCustomersResponse,
  MedusaAdminEmailLogsResponse,
  MedusaAdminOrder,
  MedusaAdminOrderResponse,
  MedusaAdminOrdersResponse,
  MedusaAdminProduct,
  MedusaAdminProductResponse,
  MedusaAdminProductsResponse,
  MedusaPacketaLabelOrdersResponse,
  OrderEmailTemplatesResponse,
  PacketaConfigInput,
  PacketaConfigResponse,
  PacketaLabelOrdersResponse,
  PayloadRuntimeConfigResponse,
  PendingB2BCustomersResponse,
  PplConfigInput,
  PplConfigResponse,
  QrPaymentConfigInput,
  QrPaymentConfigResponse,
  SendOrderEmailResponse,
} from "./admin-types"

const ADMIN_API_PAGE_SIZE = 100
const ADMIN_API_SCAN_LIMIT = 2000
const ACTION_REQUIRED_LIST_LIMIT = 50
const ACTION_REQUIRED_REFETCH_INTERVAL_MS = 60_000
const ACTION_REQUIRED_STALE_TIME_MS = 15_000
const EMAIL_LOG_LIST_LIMIT = 20
const PACKETA_LABEL_ORDER_LIST_LIMIT = 50
const PRODUCT_LIST_LIMIT = 20
const CUSTOMER_ORDER_LIST_LIMIT = 10
const CUSTOMER_GROUP_LIST_LIMIT = 20

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

const ORDER_DETAIL_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "canceled_at",
  "customer_id",
  "total",
  "subtotal",
  "original_total",
  "item_total",
  "item_subtotal",
  "shipping_total",
  "shipping_subtotal",
  "discount_total",
  "tax_total",
  "refundable_total",
  "currency_code",
  "status",
  "metadata",
  "payment_status",
  "payment_collections.id",
  "payment_collections.status",
  "payment_collections.amount",
  "payment_collections.currency_code",
  "payment_collections.payments.id",
  "payment_collections.payments.provider_id",
  "payment_collections.payments.amount",
  "payment_collections.payments.currency_code",
  "payment_collections.payments.created_at",
  "payment_collections.payments.captured_at",
  "payment_collections.payments.canceled_at",
  "payment_collections.payments.refunds.id",
  "payment_collections.payments.refunds.amount",
  "payment_collections.payments.refunds.currency_code",
  "payment_collections.payments.refunds.created_at",
  "payment_collections.payments.refunds.payment_id",
  "fulfillment_status",
  "fulfillments.id",
  "fulfillments.provider_id",
  "fulfillments.created_at",
  "fulfillments.requires_shipping",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "fulfillments.data",
  "fulfillments.items.id",
  "fulfillments.items.line_item_id",
  "fulfillments.items.quantity",
  "fulfillments.items.title",
  "fulfillments.labels.id",
  "fulfillments.labels.tracking_number",
  "fulfillments.labels.tracking_url",
  "fulfillments.labels.label_url",
  "*customer",
  "*sales_channel",
  "*shipping_methods",
  "*items",
  "*items.variant",
  "*items.product",
  "*shipping_address",
  "*billing_address",
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

const CUSTOMER_DETAIL_FIELDS = [
  "id",
  "email",
  "first_name",
  "last_name",
  "company_name",
  "phone",
  "created_at",
  "updated_at",
  "has_account",
  "default_billing_address_id",
  "default_shipping_address_id",
  "metadata",
  "+*addresses",
  "*groups",
].join(",")

const CUSTOMER_ORDER_FIELDS = [
  "id",
  "display_id",
  "custom_display_id",
  "email",
  "created_at",
  "total",
  "currency_code",
  "status",
  "payment_status",
  "fulfillment_status",
].join(",")

const CUSTOMER_GROUP_FIELDS = [
  "id",
  "name",
  "created_at",
  "updated_at",
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

const PRODUCT_DETAIL_FIELDS = [
  "id",
  "title",
  "subtitle",
  "handle",
  "description",
  "thumbnail",
  "status",
  "metadata",
  "*variants",
  "*options",
  "*collection",
  "*sales_channels",
  "*images",
  "*categories",
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

async function fetchAdminText(
  path: string,
  params?: Record<string, string>
): Promise<string> {
  const headers = new Headers({
    Accept: "text/html",
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
    const message = await response.text().catch(() => "")

    throw createApiError(
      message || `Admin API request failed with ${response.status}`,
      response.status
    )
  }

  return response.text()
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

function fetchCustomerDetailFromAdminApi(
  id: string
): Promise<MedusaAdminCustomerResponse> {
  return fetchAdminApi<MedusaAdminCustomerResponse>(`/admin/customers/${id}`, {
    fields: CUSTOMER_DETAIL_FIELDS,
  })
}

async function fetchCustomerOrdersFromAdminApi({
  customerId,
  offset,
}: {
  customerId: string
  offset: number
}): Promise<AdminCustomerOrdersResponse> {
  const response = await fetchAdminApi<MedusaAdminOrdersResponse>(
    "/admin/orders",
    {
      customer_id: customerId,
      fields: CUSTOMER_ORDER_FIELDS,
      limit: String(CUSTOMER_ORDER_LIST_LIMIT),
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
    orders: response.orders,
  }
}

async function fetchCustomerGroupsFromAdminApi({
  customerId,
  offset,
}: {
  customerId: string
  offset: number
}): Promise<AdminCustomerGroupsResponse> {
  const response = await fetchAdminApi<MedusaAdminCustomerGroupsResponse>(
    "/admin/customer-groups",
    {
      "customers[id]": customerId,
      fields: CUSTOMER_GROUP_FIELDS,
      limit: String(CUSTOMER_GROUP_LIST_LIMIT),
      offset: String(offset),
      order: "name",
    }
  )

  return {
    count: response.count,
    customer_groups: response.customer_groups,
    has_next: response.offset + response.limit < response.count,
    has_previous: response.offset > 0,
    limit: response.limit,
    offset: response.offset,
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

function fetchProductDetailFromAdminApi(
  id: string
): Promise<MedusaAdminProductResponse> {
  return fetchAdminApi<MedusaAdminProductResponse>(`/admin/products/${id}`, {
    fields: PRODUCT_DETAIL_FIELDS,
  })
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

function fetchOrderDetailFromAdminApi(
  id: string
): Promise<MedusaAdminOrderResponse> {
  return fetchAdminApi<MedusaAdminOrderResponse>(`/admin/orders/${id}`, {
    fields: ORDER_DETAIL_FIELDS,
  })
}

function fetchOrderEmailTemplatesFromAdminApi(): Promise<OrderEmailTemplatesResponse> {
  return fetchAdminApi<OrderEmailTemplatesResponse>(
    "/admin/orders/email-templates"
  )
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

function fetchPplConfigFromAdminApi(): Promise<PplConfigResponse> {
  return fetchAdminApi<PplConfigResponse>("/admin/ppl-config")
}

function fetchPayloadConfigFromAdminApi(): Promise<PayloadRuntimeConfigResponse> {
  return fetchAdminApi<PayloadRuntimeConfigResponse>("/admin/payload/config")
}

export function fetchPayloadSsoHtml(returnTo: string) {
  return fetchAdminText("/admin/payload/sso", { returnTo })
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

export function updatePplConfig(input: PplConfigInput) {
  return postAdminApi<PplConfigResponse>("/admin/ppl-config", input)
}

export function sendOrderEmail({
  orderId,
  template,
}: {
  orderId: string
  template: string
}) {
  return postAdminApi<SendOrderEmailResponse>(
    `/admin/orders/${orderId}/email`,
    {
      template,
    }
  )
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
    refetchInterval: enabled ? ACTION_REQUIRED_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    queryKey: ["action-required-summary", MEDUSA_BACKEND_URL],
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  })
}

export function useActionRequiredOrders() {
  return useQuery({
    queryFn: fetchActionRequiredOrdersFromAdminApi,
    refetchInterval: ACTION_REQUIRED_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    queryKey: [
      "action-required-orders",
      MEDUSA_BACKEND_URL,
      { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
    ],
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  })
}

export function usePendingB2BCustomers() {
  return useQuery({
    queryFn: fetchPendingB2BCustomersFromAdminApi,
    refetchInterval: ACTION_REQUIRED_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
    queryKey: [
      "pending-b2b-customers",
      MEDUSA_BACKEND_URL,
      { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
    ],
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  })
}

export function useAdminCustomerDetail({
  id,
}: {
  id: string | null | undefined
}) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchCustomerDetailFromAdminApi(id as string),
    queryKey: ["admin-customer-detail", MEDUSA_BACKEND_URL, id],
  })
}

export function useAdminCustomerOrders({
  customerId,
  offset,
}: {
  customerId: string | null | undefined
  offset: number
}) {
  return useQuery({
    enabled: Boolean(customerId),
    queryFn: () =>
      fetchCustomerOrdersFromAdminApi({
        customerId: customerId as string,
        offset,
      }),
    queryKey: [
      "admin-customer-orders",
      MEDUSA_BACKEND_URL,
      { customerId, limit: CUSTOMER_ORDER_LIST_LIMIT, offset },
    ],
  })
}

export function useAdminCustomerGroups({
  customerId,
  offset,
}: {
  customerId: string | null | undefined
  offset: number
}) {
  return useQuery({
    enabled: Boolean(customerId),
    queryFn: () =>
      fetchCustomerGroupsFromAdminApi({
        customerId: customerId as string,
        offset,
      }),
    queryKey: [
      "admin-customer-groups",
      MEDUSA_BACKEND_URL,
      { customerId, limit: CUSTOMER_GROUP_LIST_LIMIT, offset },
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

export function useAdminProductDetail({
  id,
}: {
  id: string | null | undefined
}) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchProductDetailFromAdminApi(id as string),
    queryKey: ["admin-product-detail", MEDUSA_BACKEND_URL, id],
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

export function useAdminOrderDetail({ id }: { id: string | null | undefined }) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchOrderDetailFromAdminApi(id as string),
    queryKey: ["admin-order-detail", MEDUSA_BACKEND_URL, id],
  })
}

export function useOrderEmailTemplates() {
  return useQuery({
    queryFn: fetchOrderEmailTemplatesFromAdminApi,
    queryKey: ["order-email-templates", MEDUSA_BACKEND_URL],
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

export function usePplConfig() {
  return useQuery({
    queryFn: fetchPplConfigFromAdminApi,
    queryKey: ["ppl-config", MEDUSA_BACKEND_URL],
  })
}

export function usePayloadConfig() {
  return useQuery({
    queryFn: fetchPayloadConfigFromAdminApi,
    queryKey: ["payload-config", MEDUSA_BACKEND_URL],
  })
}

export {
  CUSTOMER_GROUP_LIST_LIMIT,
  CUSTOMER_ORDER_LIST_LIMIT,
  EMAIL_LOG_LIST_LIMIT,
  PACKETA_LABEL_ORDER_LIST_LIMIT,
  PRODUCT_LIST_LIMIT,
}
