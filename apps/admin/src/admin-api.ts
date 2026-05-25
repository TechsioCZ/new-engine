import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  AdminNamedReferenceResponse,
  AdminPricePreference,
  AdminPricePreferencesResponse,
  AdminProductCategoriesResponse,
  AdminProductsResponse,
  AdminStoreSummary,
  MedusaAdminCustomer,
  MedusaAdminCustomersResponse,
  MedusaAdminEmailLogsResponse,
  MedusaAdminOrder,
  MedusaAdminOrderResponse,
  MedusaAdminOrdersResponse,
  MedusaAdminProduct,
  MedusaAdminProductCategoriesResponse,
  MedusaAdminProductCategoryResponse,
  MedusaAdminProductResponse,
  MedusaAdminProductsResponse,
  MedusaAdminStoresResponse,
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
const CATEGORY_LIST_LIMIT = 20
const CATEGORY_PRODUCT_LIST_LIMIT = 10
const PRODUCT_LIST_LIMIT = 20
const STORE_SUMMARY_FIELDS = ["id", "name"].join(",")
const STORE_DETAIL_FIELDS = [
  "id",
  "name",
  "default_region_id",
  "default_sales_channel_id",
  "default_location_id",
  "metadata",
  "+supported_currencies",
  "+supported_locales",
].join(",")

function getActionRequiredSummaryQueryKey() {
  return ["action-required-summary", MEDUSA_BACKEND_URL] as const
}

function getActionRequiredOrdersQueryKey() {
  return [
    "action-required-orders",
    MEDUSA_BACKEND_URL,
    { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
  ] as const
}

function getPendingB2BCustomersQueryKey() {
  return [
    "pending-b2b-customers",
    MEDUSA_BACKEND_URL,
    { limit: ACTION_REQUIRED_LIST_LIMIT, offset: 0 },
  ] as const
}

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

const CATEGORY_ROOT_LIST_FIELDS = [
  "id",
  "name",
  "rank",
  "category_children",
  "handle",
  "is_internal",
  "is_active",
].join(",")

const CATEGORY_SEARCH_LIST_FIELDS = [
  "id",
  "name",
  "rank",
  "handle",
  "is_internal",
  "is_active",
  "parent_category",
].join(",")

const CATEGORY_DETAIL_FIELDS = [
  "id",
  "name",
  "description",
  "handle",
  "is_active",
  "is_internal",
  "rank",
  "parent_category_id",
  "metadata",
  "*parent_category",
  "*category_children",
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
    has_next: !result.countExact || orders.length > ACTION_REQUIRED_LIST_LIMIT,
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
    has_next:
      !result.countExact || customers.length > ACTION_REQUIRED_LIST_LIMIT,
    limit: ACTION_REQUIRED_LIST_LIMIT,
    offset: 0,
  }
}

function getActionRequiredOrdersQueryOptions() {
  return {
    queryFn: fetchActionRequiredOrdersFromAdminApi,
    queryKey: getActionRequiredOrdersQueryKey(),
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  }
}

function getPendingB2BCustomersQueryOptions() {
  return {
    queryFn: fetchPendingB2BCustomersFromAdminApi,
    queryKey: getPendingB2BCustomersQueryKey(),
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  }
}

async function fetchProductsFromAdminApi({
  categoryId,
  limit = PRODUCT_LIST_LIMIT,
  offset,
  q,
}: {
  categoryId?: string
  limit?: number
  offset: number
  q?: string
}): Promise<AdminProductsResponse> {
  const response = await fetchAdminApi<MedusaAdminProductsResponse>(
    "/admin/products",
    {
      fields: PRODUCT_FIELDS,
      is_giftcard: "false",
      limit: String(limit),
      offset: String(offset),
      order: "-created_at",
      ...(categoryId ? { category_id: categoryId } : {}),
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

async function fetchProductCategoriesFromAdminApi({
  offset,
  q,
}: {
  offset: number
  q?: string
}): Promise<AdminProductCategoriesResponse> {
  const response = await fetchAdminApi<MedusaAdminProductCategoriesResponse>(
    "/admin/product-categories",
    q
      ? {
          fields: CATEGORY_SEARCH_LIST_FIELDS,
          include_ancestors_tree: "true",
          limit: String(CATEGORY_LIST_LIMIT),
          offset: String(offset),
          order: "rank",
          q,
        }
      : {
          fields: CATEGORY_ROOT_LIST_FIELDS,
          include_descendants_tree: "true",
          limit: String(CATEGORY_LIST_LIMIT),
          offset: String(offset),
          order: "rank",
          parent_category_id: "null",
        }
  )

  return {
    count: response.count,
    has_next: response.offset + response.limit < response.count,
    has_previous: response.offset > 0,
    limit: response.limit,
    offset: response.offset,
    product_categories: response.product_categories,
  }
}

async function fetchActiveStoreFromAdminApi(
  fields = STORE_SUMMARY_FIELDS
): Promise<AdminStoreSummary | null> {
  const response = await fetchAdminApi<MedusaAdminStoresResponse>(
    "/admin/stores",
    {
      fields,
      limit: "1",
      offset: "0",
    }
  )

  return response.stores[0] ?? null
}

function fetchProductDetailFromAdminApi(
  id: string
): Promise<MedusaAdminProductResponse> {
  return fetchAdminApi<MedusaAdminProductResponse>(`/admin/products/${id}`, {
    fields: PRODUCT_DETAIL_FIELDS,
  })
}

function fetchProductCategoryDetailFromAdminApi(
  id: string
): Promise<MedusaAdminProductCategoryResponse> {
  return fetchAdminApi<MedusaAdminProductCategoryResponse>(
    `/admin/product-categories/${id}`,
    {
      fields: CATEGORY_DETAIL_FIELDS,
      include_ancestors_tree: "true",
      include_descendants_tree: "true",
    }
  )
}

function fetchRegionReferenceFromAdminApi(
  id: string
): Promise<AdminNamedReferenceResponse<"region">> {
  return fetchAdminApi<AdminNamedReferenceResponse<"region">>(
    `/admin/regions/${id}`,
    {
      fields: "id,name",
    }
  )
}

function fetchSalesChannelReferenceFromAdminApi(
  id: string
): Promise<AdminNamedReferenceResponse<"sales_channel">> {
  return fetchAdminApi<AdminNamedReferenceResponse<"sales_channel">>(
    `/admin/sales-channels/${id}`,
    {
      fields: "id,name",
    }
  )
}

function fetchStockLocationReferenceFromAdminApi(
  id: string
): Promise<AdminNamedReferenceResponse<"stock_location">> {
  return fetchAdminApi<AdminNamedReferenceResponse<"stock_location">>(
    `/admin/stock-locations/${id}`,
    {
      fields: "id,name",
    }
  )
}

async function fetchCurrencyPricePreferencesFromAdminApi(
  currencyCodes: string[]
): Promise<AdminPricePreference[]> {
  const codeSet = new Set(currencyCodes.map((code) => code.toLowerCase()))

  if (codeSet.size === 0) {
    return []
  }

  const { records: preferences } = await fetchAllAdminPages<
    AdminPricePreferencesResponse,
    AdminPricePreference
  >({
    params: {
      attribute: "currency_code",
    },
    path: "/admin/price-preferences",
    readItems: (response) => response.price_preferences,
  })

  return preferences.filter((preference) => {
    const value = preference.value?.toLowerCase()

    return preference.attribute === "currency_code" && value
      ? codeSet.has(value)
      : false
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
  const queryClient = useQueryClient()

  return useQuery({
    enabled,
    queryFn: async (): Promise<ActionRequiredSummary> => {
      const [orders, customers] = await Promise.all([
        queryClient.fetchQuery(getActionRequiredOrdersQueryOptions()),
        queryClient.fetchQuery(getPendingB2BCustomersQueryOptions()),
      ])

      return {
        orders,
        customers,
      }
    },
    refetchInterval: enabled ? ACTION_REQUIRED_REFETCH_INTERVAL_MS : false,
    refetchOnWindowFocus: true,
    queryKey: getActionRequiredSummaryQueryKey(),
    staleTime: ACTION_REQUIRED_STALE_TIME_MS,
  })
}

export function useActionRequiredOrders() {
  return useQuery({
    ...getActionRequiredOrdersQueryOptions(),
    refetchOnWindowFocus: false,
  })
}

export function usePendingB2BCustomers() {
  return useQuery({
    ...getPendingB2BCustomersQueryOptions(),
    refetchOnWindowFocus: false,
  })
}

export function useAdminProducts({
  categoryId,
  limit,
  offset,
  q,
}: {
  categoryId?: string
  limit?: number
  offset: number
  q?: string
}) {
  return useQuery({
    queryFn: () => fetchProductsFromAdminApi({ categoryId, limit, offset, q }),
    queryKey: [
      "admin-products",
      MEDUSA_BACKEND_URL,
      { categoryId, limit: limit ?? PRODUCT_LIST_LIMIT, offset, q },
    ],
  })
}

export function useAdminProductCategories({
  offset,
  q,
}: {
  offset: number
  q?: string
}) {
  return useQuery({
    queryFn: () => fetchProductCategoriesFromAdminApi({ offset, q }),
    queryKey: [
      "admin-product-categories",
      MEDUSA_BACKEND_URL,
      { limit: CATEGORY_LIST_LIMIT, offset, q },
    ],
  })
}

export function useAdminProductCategoryDetail({
  id,
}: {
  id: string | null | undefined
}) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => {
      if (!id) {
        throw new Error("Missing product category id")
      }

      return fetchProductCategoryDetailFromAdminApi(id)
    },
    queryKey: ["admin-product-category-detail", MEDUSA_BACKEND_URL, id],
  })
}

export function useAdminCategoryProducts({
  categoryId,
  offset,
  q,
}: {
  categoryId: string | null | undefined
  offset: number
  q?: string
}) {
  return useQuery({
    enabled: Boolean(categoryId),
    queryFn: () => {
      if (!categoryId) {
        throw new Error("Missing product category id")
      }

      return fetchProductsFromAdminApi({
        categoryId,
        limit: CATEGORY_PRODUCT_LIST_LIMIT,
        offset,
        q,
      })
    },
    queryKey: [
      "admin-category-products",
      MEDUSA_BACKEND_URL,
      { categoryId, limit: CATEGORY_PRODUCT_LIST_LIMIT, offset, q },
    ],
  })
}

export function useAdminStoreSummary() {
  return useQuery({
    queryFn: () => fetchActiveStoreFromAdminApi(),
    queryKey: ["admin-store-summary", MEDUSA_BACKEND_URL],
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminStoreDetail() {
  return useQuery({
    queryFn: () => fetchActiveStoreFromAdminApi(STORE_DETAIL_FIELDS),
    queryKey: ["admin-store-detail", MEDUSA_BACKEND_URL],
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminCurrencyPricePreferences(currencyCodes: string[]) {
  const normalizedCurrencyCodes = [
    ...new Set(
      currencyCodes
        .map((code) => code.trim().toLowerCase())
        .filter((code) => code.length > 0)
    ),
  ].sort()

  return useQuery({
    enabled: normalizedCurrencyCodes.length > 0,
    queryFn: () =>
      fetchCurrencyPricePreferencesFromAdminApi(normalizedCurrencyCodes),
    queryKey: [
      "admin-currency-price-preferences",
      MEDUSA_BACKEND_URL,
      normalizedCurrencyCodes,
    ],
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminRegionReference(id: string | null | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchRegionReferenceFromAdminApi(id as string),
    queryKey: ["admin-region-reference", MEDUSA_BACKEND_URL, id],
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminSalesChannelReference(id: string | null | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchSalesChannelReferenceFromAdminApi(id as string),
    queryKey: ["admin-sales-channel-reference", MEDUSA_BACKEND_URL, id],
    retry: false,
    staleTime: 60_000,
  })
}

export function useAdminStockLocationReference(id: string | null | undefined) {
  return useQuery({
    enabled: Boolean(id),
    queryFn: () => fetchStockLocationReferenceFromAdminApi(id as string),
    queryKey: ["admin-stock-location-reference", MEDUSA_BACKEND_URL, id],
    retry: false,
    staleTime: 60_000,
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
  CATEGORY_LIST_LIMIT,
  CATEGORY_PRODUCT_LIST_LIMIT,
  EMAIL_LOG_LIST_LIMIT,
  PACKETA_LABEL_ORDER_LIST_LIMIT,
  PRODUCT_LIST_LIMIT,
}
