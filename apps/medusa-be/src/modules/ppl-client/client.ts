import { setTimeout as sleep } from "node:timers/promises"

import { MedusaError } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import type {
  PplAccessPoint,
  PplAccessPointsQuery,
  PplAddress,
  PplAddressWhisperItem,
  PplAddressWhisperQuery,
  PplApiInfo,
  PplBatchLabelQuery,
  PplBatchLabelResponse,
  PplBatchResponse,
  PplBatchUpdateRequest,
  PplCodelistCountry,
  PplCodelistCurrency,
  PplCodelistProduct,
  PplCodelistQuery,
  PplCodelistServiceItem,
  PplCodelistServicePriceLimit,
  PplCodelistStatus,
  PplConnectSetRequest,
  PplCustomerAddressResponse,
  PplCustomerInfo,
  PplLabelSettings,
  PplOptions,
  PplOrder,
  PplOrderBatchRequest,
  PplOrderBatchResponse,
  PplOrderCancelQuery,
  PplOrderCancelRequest,
  PplOrderQuery,
  PplReturnChannel,
  PplRoutingQuery,
  PplRoutingResponse,
  PplServicePriceLimitQuery,
  PplShipmentInfo,
  PplShipmentQuery,
  PplShipmentRedirectRequest,
  PplShipmentRequest,
  PplVersionInformationResponse,
} from "./types"

const BASE_URLS = {
  production: "https://api.dhl.com/ecs/ppl/myapi2",
  testing: "https://api-dev.dhl.com/ecs/ppl/myapi2",
} as const

const DEFAULT_CODELIST_QUERY: PplCodelistQuery = { limit: 100, offset: 0 }
const HTTP_METHODS = {
  delete: "DELETE",
  get: "GET",
  post: "POST",
  put: "PUT",
} as const

type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS]
type ResponseParser<T> = (value: unknown) => T
interface OAuthToken {
  accessToken: string
  expiresAt: number | null
}
interface OAuthClient {
  clientCredentials: (params: { scope: string[] }) => Promise<OAuthToken>
}
type OAuthClientConstructor = new (settings: {
  authenticationMethod: "client_secret_post"
  clientId: string
  clientSecret: string
  server: string
  tokenEndpoint: string
}) => OAuthClient

interface RequestOptions<T> {
  method?: HttpMethod
  body?: unknown
  allow404?: boolean
  parse: ResponseParser<T>
}

type RetryAttemptResult<T> =
  | { retry: true; error: Error }
  | { retry: false; value: T }

const optionalString = z.optional(z.string())
const optionalNumber = z.optional(z.number())
const addressSchema = z.object({
  city: z.string(),
  contact: optionalString,
  country: z.string(),
  email: optionalString,
  name: z.string(),
  name2: optionalString,
  phone: optionalString,
  street: z.string(),
  zipCode: z.string(),
}) satisfies z.ZodType<PplAddress>
const batchItemSchema = z.object({
  errorMessage: optionalString,
  importState: z.optional(
    z.enum(["Received", "InProcess", "Complete", "Error"]),
  ),
  labelUrl: optionalString,
  referenceId: z.string(),
  relatedItems: z.optional(z.array(z.unknown())),
  shipmentNumber: optionalString,
  trackingUrl: optionalString,
})
const batchResponseSchema = z.object({
  items: z.array(batchItemSchema),
}) satisfies z.ZodType<PplBatchResponse>
const shipmentInfoSchema = z.object({
  cashOnDelivery: z.optional(
    z.object({
      codPaidDate: optionalString,
      codPrice: z.number(),
    }),
  ),
  deliveryDate: optionalString,
  pickupDate: optionalString,
  productType: z.string(),
  recipient: z.optional(addressSchema),
  referenceId: optionalString,
  sender: z.optional(addressSchema),
  shipmentNumber: z.string(),
  shipmentState: z.enum([
    "DataShipment",
    "Active",
    "PickedUpFromSender",
    "OutForDelivery",
    "DeliveredToPickupPoint",
    "Delivered",
    "NotDelivered",
    "BackToSender",
    "Rejected",
    "Dormant",
    "Undelivered",
  ]),
  stateDate: z.string(),
  weight: optionalNumber,
}) satisfies z.ZodType<PplShipmentInfo>
const accessPointSchema = z.object({
  accessPointType: z.string(),
  address: addressSchema,
  code: z.string(),
  isActive: z.optional(z.boolean()),
  latitude: optionalNumber,
  longitude: optionalNumber,
  name: z.string(),
  openingHours: optionalString,
}) satisfies z.ZodType<PplAccessPoint>
const addressWhisperItemSchema = z.object({
  city: optionalString,
  country: optionalString,
  street: optionalString,
  zipCode: optionalString,
}) satisfies z.ZodType<PplAddressWhisperItem>
const codelistProductSchema = z.object({
  code: z.string(),
  description: optionalString,
  name: z.string(),
}) satisfies z.ZodType<PplCodelistProduct>
const codelistCountrySchema = z.object({
  codAllowed: z.optional(z.boolean()),
  code: z.string(),
  name: z.string(),
}) satisfies z.ZodType<PplCodelistCountry>
const codelistCurrencySchema = z.object({
  code: z.string(),
  name: z.string(),
}) satisfies z.ZodType<PplCodelistCurrency>
const codelistServiceSchema = z.object({
  code: z.string(),
  description: optionalString,
  name: z.string(),
}) satisfies z.ZodType<PplCodelistServiceItem>
const codelistStatusSchema = z.object({
  code: z.string(),
  description: optionalString,
  name: z.string(),
}) satisfies z.ZodType<PplCodelistStatus>
const servicePriceLimitSchema = z.object({
  country: optionalString,
  currency: optionalString,
  maxValue: optionalNumber,
  minValue: optionalNumber,
  product: optionalString,
  service: optionalString,
}) satisfies z.ZodType<PplCodelistServicePriceLimit>
const customerInfoSchema = z.object({
  currencies: z.optional(z.array(z.string())),
  customerId: optionalNumber,
  customerName: optionalString,
}) satisfies z.ZodType<PplCustomerInfo>
const customerAddressSchema = addressSchema.extend({
  code: z.string(),
  default: z.optional(z.boolean()),
})
const orderSchema = z.object({
  createdDate: optionalString,
  customerReference: optionalString,
  email: optionalString,
  errorMessage: optionalString,
  note: optionalString,
  orderId: optionalNumber,
  orderNumber: optionalString,
  orderReference: optionalString,
  orderState: z.enum(["Created", "InProcess", "Complete", "Canceled", "Error"]),
  orderType: z.string(),
  productType: optionalString,
  recipient: z.optional(addressSchema),
  sendDate: optionalString,
  sendTimeFrom: optionalString,
  sendTimeTo: optionalString,
  sender: z.optional(addressSchema),
  shipmentCount: optionalNumber,
}) satisfies z.ZodType<PplOrder>
const orderBatchItemSchema = z.object({
  errorMessage: optionalString,
  importState: z.enum(["Received", "InProcess", "Complete", "Error"]),
  orderNumber: optionalString,
  referenceId: optionalString,
})
const orderBatchResponseSchema = z.object({
  batchId: z.string(),
  items: z.array(orderBatchItemSchema),
}) satisfies z.ZodType<PplOrderBatchResponse>
const batchLabelItemSchema = z.object({
  labelUrl: optionalString,
  referenceId: optionalString,
  shipmentNumber: z.string(),
})
const batchLabelResponseSchema = z.object({
  completeLabelUrl: optionalString,
  items: z.array(batchLabelItemSchema),
  limit: optionalNumber,
  offset: optionalNumber,
  totalCount: optionalNumber,
}) satisfies z.ZodType<PplBatchLabelResponse>
const routingResponseSchema = z.object({
  deliveryTour: optionalString,
  depotCode: optionalString,
  routeCode: optionalString,
  sortCode: optionalString,
}) satisfies z.ZodType<PplRoutingResponse>
const versionInfoItemSchema = z.object({
  description: optionalString,
  infoType: optionalString,
  releaseDate: optionalString,
  title: optionalString,
  version: optionalString,
})
const versionInformationSchema = z.object({
  items: z.array(versionInfoItemSchema),
  totalCount: optionalNumber,
}) satisfies z.ZodType<PplVersionInformationResponse>
const apiInfoSchema = z.object({
  environment: optionalString,
  status: optionalString,
  version: optionalString,
}) satisfies z.ZodType<PplApiInfo>

const customerAddressResponseSchema = z.array(
  customerAddressSchema,
) satisfies z.ZodType<PplCustomerAddressResponse>

const emptyResponseParser = (value: unknown): null => {
  if (value !== null) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "PPL returned an unexpected response body",
    )
  }
  return null
}
const parseArrayOrItems = <T>(schema: z.ZodType<T>) => {
  const responseSchema = z.union([
    z.array(schema),
    z.object({ items: z.array(schema) }),
  ])

  return (value: unknown): T[] => {
    const response = responseSchema.parse(value)
    return Array.isArray(response) ? response : response.items
  }
}

const isOAuthClientConstructor = (
  value: unknown,
): value is OAuthClientConstructor => typeof value === "function"
const getOAuthClientExport = (value: unknown): unknown =>
  typeof value === "object" && value !== null && "OAuth2Client" in value
    ? value.OAuth2Client
    : undefined

const loadOAuthClientConstructor =
  async (): Promise<OAuthClientConstructor> => {
    const moduleValue: unknown = await import("@badgateway/oauth2-client")
    const oauthClientValue = getOAuthClientExport(moduleValue)
    if (!isOAuthClientConstructor(oauthClientValue)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: OAuth2 client constructor is unavailable",
      )
    }
    return oauthClientValue
  }

/**
 * PPL CPL API Client - Pure HTTP layer
 *
 * Raw HTTP client for PPL API endpoints. No caching, no rate limiting,
 * no token management - all that is handled by PplClientModuleService.
 *
 * This client handles:
 * - OAuth2 token acquisition (called by service)
 * - HTTP request/response handling
 * - Retry logic for transient failures
 * - Response parsing
 */
export class PplClient {
  private oauth2Client: OAuthClient | null = null

  private readonly MAX_RETRIES = 3
  private readonly INITIAL_RETRY_DELAY_MS = 200
  // 30 seconds
  private static readonly REQUEST_TIMEOUT_MS = 30_000

  private readonly options: PplOptions

  constructor(options: PplOptions) {
    this.options = options
  }

  private async getOAuthClient(): Promise<OAuthClient> {
    if (this.oauth2Client !== null) {
      return this.oauth2Client
    }

    const OAuth2ClientConstructor = await loadOAuthClientConstructor()
    this.oauth2Client = new OAuth2ClientConstructor({
      authenticationMethod: "client_secret_post",
      clientId: this.options.client_id,
      clientSecret: this.options.client_secret,
      server: this.baseUrl,
      tokenEndpoint: "/ecs/ppl/myapi2/login/getAccessToken",
    })
    return this.oauth2Client
  }

  private get baseUrl(): string {
    return BASE_URLS[this.options.environment]
  }

  /**
   * Fetch new OAuth token from PPL API
   * Called by service layer which handles caching/sharing
   */
  async fetchNewToken(): Promise<{ accessToken: string; expiresAt: number }> {
    const oauth2Client = await this.getOAuthClient()
    const tokenResponse = await oauth2Client.clientCredentials({
      scope: ["myapi2"],
    })

    // @badgateway/oauth2-client v3.x returns expiresAt already in milliseconds
    const expiresAt = tokenResponse.expiresAt ?? Date.now() + 1800 * 1000

    return {
      accessToken: tokenResponse.accessToken,
      expiresAt,
    }
  }

  // ============================================
  // Shipment Operations
  // ============================================

  async createShipmentBatch(
    token: string,
    shipments: PplShipmentRequest[],
    options?: {
      labelSettings?: PplLabelSettings
      returnChannel?: PplReturnChannel
      shipmentsOrderBy?: string
    },
  ): Promise<string> {
    const body = {
      labelSettings: options?.labelSettings ?? {
        dpi: 300,
        format: this.options.default_label_format,
      },
      shipments,
      ...(options?.returnChannel !== undefined && {
        returnChannel: options.returnChannel,
      }),
      ...(options?.shipmentsOrderBy !== undefined && {
        shipmentsOrderBy: options.shipmentsOrderBy,
      }),
    }

    return await this.createBatchWithLocationHeader(
      token,
      "/shipment/batch",
      body,
    )
  }

  async getBatchStatus(
    token: string,
    batchId: string,
  ): Promise<PplBatchResponse> {
    return await this.get(token, `/shipment/batch/${batchId}`, (value) =>
      batchResponseSchema.parse(value),
    )
  }

  async downloadLabel(token: string, labelUrl: string): Promise<Buffer> {
    const fullUrl = labelUrl.startsWith("http")
      ? labelUrl
      : `${this.baseUrl}${labelUrl}`

    const response = await PplClient.fetchWithTimeout(fullUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL label download failed: ${response.status} - ${labelUrl}`,
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async getShipmentInfo(
    token: string,
    query: PplShipmentQuery,
  ): Promise<PplShipmentInfo[]> {
    const params = PplClient.buildShipmentQueryParams(query)
    const { data } = await this.makeRequest(
      token,
      `/shipment?${params.toString()}`,
      { parse: parseArrayOrItems(shipmentInfoSchema) },
    )
    return data ?? []
  }

  async cancelShipment(
    token: string,
    shipmentNumber: string,
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, `/shipment/${shipmentNumber}/cancel`, {
        method: HTTP_METHODS.post,
        parse: emptyResponseParser,
      })
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Access Points
  // ============================================

  async getAccessPoints(
    token: string,
    query: PplAccessPointsQuery = {},
  ): Promise<PplAccessPoint[]> {
    const params = PplClient.buildAccessPointQueryParams(query)
    const { data } = await this.makeRequest(
      token,
      `/accessPoint?${params.toString()}`,
      { parse: parseArrayOrItems(accessPointSchema) },
    )
    return data ?? []
  }

  // ============================================
  // Address Whisper
  // ============================================

  async getAddressWhisper(
    token: string,
    query: PplAddressWhisperQuery,
  ): Promise<PplAddressWhisperItem[]> {
    const params = new URLSearchParams()
    if (query.street !== undefined) {
      params.append("Street", query.street)
    }
    if (query.zipCode !== undefined) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.city !== undefined) {
      params.append("City", query.city)
    }
    if (query.calledFrom !== undefined) {
      params.append("CalledFrom", query.calledFrom)
    }

    const { data } = await this.makeRequest(
      token,
      `/addressWhisper?${params.toString()}`,
      { parse: parseArrayOrItems(addressWhisperItemSchema) },
    )
    return data ?? []
  }

  // ============================================
  // Codelists
  // ============================================

  async getCodelistProducts(
    token: string,
    query: PplCodelistQuery = DEFAULT_CODELIST_QUERY,
  ): Promise<PplCodelistProduct[]> {
    return await this.fetchCodelist(
      token,
      "product",
      query,
      codelistProductSchema,
    )
  }

  async getCodelistCountries(
    token: string,
    query: PplCodelistQuery = DEFAULT_CODELIST_QUERY,
  ): Promise<PplCodelistCountry[]> {
    return await this.fetchCodelist(
      token,
      "country",
      query,
      codelistCountrySchema,
    )
  }

  async getCodelistCurrencies(
    token: string,
    query: PplCodelistQuery = DEFAULT_CODELIST_QUERY,
  ): Promise<PplCodelistCurrency[]> {
    return await this.fetchCodelist(
      token,
      "currency",
      query,
      codelistCurrencySchema,
    )
  }

  async getCodelistServices(
    token: string,
    query: PplCodelistQuery = DEFAULT_CODELIST_QUERY,
  ): Promise<PplCodelistServiceItem[]> {
    return await this.fetchCodelist(
      token,
      "service",
      query,
      codelistServiceSchema,
    )
  }

  async getCodelistStatuses(
    token: string,
    query: PplCodelistQuery = DEFAULT_CODELIST_QUERY,
  ): Promise<PplCodelistStatus[]> {
    return await this.fetchCodelist(
      token,
      "status",
      query,
      codelistStatusSchema,
    )
  }

  async getCodelistServicePriceLimits(
    token: string,
    query: PplServicePriceLimitQuery,
  ): Promise<PplCodelistServicePriceLimit[]> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })
    if (query.service !== undefined) {
      params.append("Service", query.service)
    }
    if (query.currency !== undefined) {
      params.append("Currency", query.currency)
    }
    if (query.country !== undefined) {
      params.append("Country", query.country)
    }
    if (query.product !== undefined) {
      params.append("Product", query.product)
    }

    const { data } = await this.makeRequest(
      token,
      `/codelist/servicePriceLimit?${params.toString()}`,
      { parse: parseArrayOrItems(servicePriceLimitSchema) },
    )
    return data ?? []
  }

  // ============================================
  // Customer
  // ============================================

  async getCustomerInfo(token: string): Promise<PplCustomerInfo | null> {
    const { data, status } = await this.makeRequest(token, "/customer", {
      allow404: true,
      parse: (value) => customerInfoSchema.parse(value),
    })
    return status === 404 ? null : data
  }

  async getCustomerAddresses(
    token: string,
  ): Promise<PplCustomerAddressResponse | null> {
    const { data, status } = await this.makeRequest(
      token,
      "/customer/address",
      {
        allow404: true,
        parse: (value) => customerAddressResponseSchema.parse(value),
      },
    )
    return status === 404 ? null : data
  }

  // ============================================
  // Orders
  // ============================================

  async createOrderBatch(
    token: string,
    request: PplOrderBatchRequest,
  ): Promise<string> {
    return await this.createBatchWithLocationHeader(
      token,
      "/order/batch",
      request,
    )
  }

  async getOrderBatchStatus(
    token: string,
    batchId: string,
  ): Promise<PplOrderBatchResponse> {
    return await this.get(token, `/order/batch/${batchId}`, (value) =>
      orderBatchResponseSchema.parse(value),
    )
  }

  async getOrders(token: string, query: PplOrderQuery): Promise<PplOrder[]> {
    const params = PplClient.buildOrderQueryParams(query)
    const { data } = await this.makeRequest(
      token,
      `/order?${params.toString()}`,
      {
        parse: parseArrayOrItems(orderSchema),
      },
    )
    return data ?? []
  }

  async cancelOrder(
    token: string,
    query: PplOrderCancelQuery,
    request?: PplOrderCancelRequest,
  ): Promise<boolean> {
    const params = new URLSearchParams()
    if (query.customerReference !== undefined) {
      params.append("CustomerReference", query.customerReference)
    }
    if (query.orderReference !== undefined) {
      params.append("OrderReference", query.orderReference)
    }

    try {
      await this.makeRequest(token, `/order/cancel?${params.toString()}`, {
        body: request,
        method: HTTP_METHODS.post,
        parse: emptyResponseParser,
      })
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Batch Operations
  // ============================================

  async updateBatch(
    token: string,
    batchId: string,
    request: PplBatchUpdateRequest,
  ): Promise<void> {
    await this.makeRequest(token, `/shipment/batch/${batchId}`, {
      body: request,
      method: HTTP_METHODS.put,
      parse: emptyResponseParser,
    })
  }

  async getBatchLabels(
    token: string,
    batchId: string,
    query: PplBatchLabelQuery,
  ): Promise<PplBatchLabelResponse> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })
    if (query.pageSize !== undefined) {
      params.append("PageSize", query.pageSize)
    }
    if (query.position !== undefined) {
      params.append("Position", String(query.position))
    }
    if (query.orderBy !== undefined) {
      params.append("OrderBy", query.orderBy)
    }

    return await this.get(
      token,
      `/shipment/batch/${batchId}/label?${params.toString()}`,
      (value) => batchLabelResponseSchema.parse(value),
    )
  }

  // ============================================
  // Shipment Redirect & Connect
  // ============================================

  async redirectShipment(
    token: string,
    shipmentNumber: string,
    request: PplShipmentRedirectRequest,
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, `/shipment/${shipmentNumber}/redirect`, {
        body: request,
        method: HTTP_METHODS.post,
        parse: emptyResponseParser,
      })
      return true
    } catch {
      return false
    }
  }

  async connectShipmentSet(
    token: string,
    request: PplConnectSetRequest,
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, "/shipment/batch/connectSet", {
        body: request,
        method: HTTP_METHODS.post,
        parse: emptyResponseParser,
      })
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Routing & Info
  // ============================================

  async getRouting(
    token: string,
    query: PplRoutingQuery,
  ): Promise<PplRoutingResponse> {
    const params = new URLSearchParams({ Country: query.country })
    if (query.parcelShopCode !== undefined) {
      params.append("ParcelShopCode", query.parcelShopCode)
    }
    if (query.street !== undefined) {
      params.append("Street", query.street)
    }
    if (query.city !== undefined) {
      params.append("City", query.city)
    }
    if (query.zipCode !== undefined) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.productType !== undefined) {
      params.append("ProductType", query.productType)
    }

    return await this.get(token, `/routing?${params.toString()}`, (value) =>
      routingResponseSchema.parse(value),
    )
  }

  async getVersionInformation(
    token: string,
  ): Promise<PplVersionInformationResponse> {
    return await this.get(token, "/versionInformation", (value) =>
      versionInformationSchema.parse(value),
    )
  }

  async getApiInfo(token: string): Promise<PplApiInfo> {
    return await this.get(token, "/info", (value) => apiInfoSchema.parse(value))
  }

  // ============================================
  // Internal Helpers
  // ============================================

  private static buildShipmentQueryParams(
    query: PplShipmentQuery,
  ): URLSearchParams {
    const params = new URLSearchParams({
      Limit: String(query.limit ?? 100),
      Offset: String(query.offset ?? 0),
    })

    const arrayParams: [string[] | undefined, string][] = [
      [query.shipmentNumbers, "ShipmentNumbers"],
      [query.invoiceNumbers, "InvoiceNumbers"],
      [query.customerReferences, "CustomerReferences"],
      [query.variableSymbols, "VariableSymbols"],
      [query.shipmentStates, "ShipmentStates"],
    ]

    for (const [values, key] of arrayParams) {
      if (values) {
        for (const value of values) {
          params.append(key, value)
        }
      }
    }

    if (query.dateFrom !== undefined) {
      params.append("DateFrom", query.dateFrom)
    }
    if (query.dateTo !== undefined) {
      params.append("DateTo", query.dateTo)
    }

    return params
  }

  private static buildAccessPointQueryParams(
    query: PplAccessPointsQuery,
  ): URLSearchParams {
    const params = new URLSearchParams({
      Limit: String(query.limit ?? 1000),
      Offset: String(query.offset ?? 0),
    })

    if (query.accessPointCode !== undefined) {
      params.append("AccessPointCode", query.accessPointCode)
    }
    if (query.countryCode !== undefined) {
      params.append("CountryCode", query.countryCode)
    }
    if (query.zipCode !== undefined) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.city !== undefined) {
      params.append("City", query.city)
    }
    if (query.accessPointTypes !== undefined) {
      params.append("AccessPointTypes", query.accessPointTypes)
    }
    if (query.radius !== undefined) {
      params.append("Radius", String(query.radius))
    }
    if (query.latitude !== undefined) {
      params.append("Latitude", String(query.latitude))
    }
    if (query.longitude !== undefined) {
      params.append("Longitude", String(query.longitude))
    }
    if (query.tribalServicePoint !== undefined) {
      params.append("TribalServicePoint", String(query.tribalServicePoint))
    }
    if (query.activeCardPayment !== undefined) {
      params.append("ActiveCardPayment", String(query.activeCardPayment))
    }
    if (query.activeCashPayment !== undefined) {
      params.append("ActiveCashPayment", String(query.activeCashPayment))
    }
    if (query.pickupEnabled !== undefined) {
      params.append("PickupEnabled", String(query.pickupEnabled))
    }
    if (query.sizes !== undefined) {
      params.append("Sizes", query.sizes)
    }

    return params
  }

  private static buildOrderQueryParams(query: PplOrderQuery): URLSearchParams {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })

    const arrayParams: [string[] | number[] | undefined, string][] = [
      [query.shipmentNumbers, "ShipmentNumbers"],
      [query.customerReferences, "CustomerReferences"],
      [query.orderReferences, "OrderReferences"],
      [query.orderNumbers, "OrderNumbers"],
      [query.orderIds, "OrderIds"],
      [query.orderStates, "OrderStates"],
    ]

    for (const [values, key] of arrayParams) {
      if (values) {
        for (const value of values) {
          params.append(key, String(value))
        }
      }
    }

    if (query.dateFrom !== undefined) {
      params.append("DateFrom", query.dateFrom)
    }
    if (query.dateTo !== undefined) {
      params.append("DateTo", query.dateTo)
    }
    if (query.sendDate !== undefined) {
      params.append("SendDate", query.sendDate)
    }
    if (query.productType !== undefined) {
      params.append("ProductType", query.productType)
    }

    return params
  }

  private async fetchCodelist<T>(
    token: string,
    codelistName: string,
    query: PplCodelistQuery,
    itemSchema: z.ZodType<T>,
  ): Promise<T[]> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })

    const { data } = await this.makeRequest(
      token,
      `/codelist/${codelistName}?${params.toString()}`,
      { parse: parseArrayOrItems(itemSchema) },
    )
    return data ?? []
  }

  private static async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = PplClient.REQUEST_TIMEOUT_MS,
  ): Promise<Response> {
    const timeoutController = new AbortController()
    const controller = new AbortController()
    const requestSignal = init.signal
    const abortFromRequestSignal = () => {
      controller.abort()
    }
    const abortFromTimeout = () => {
      controller.abort()
    }

    if (requestSignal?.aborted === true) {
      controller.abort()
    } else {
      requestSignal?.addEventListener("abort", abortFromRequestSignal, {
        once: true,
      })
    }

    timeoutController.signal.addEventListener("abort", abortFromTimeout, {
      once: true,
    })

    const timeoutId = setTimeout(() => {
      timeoutController.abort()
    }, timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AbortError" &&
        timeoutController.signal.aborted
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `PPL request timed out after ${timeoutMs}ms: ${url}`,
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
      requestSignal?.removeEventListener("abort", abortFromRequestSignal)
      timeoutController.signal.removeEventListener("abort", abortFromTimeout)
    }
  }

  private static isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private async withRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string,
  ): Promise<T> {
    return await this.attemptWithRetry(
      operation,
      handleResponse,
      errorContext,
      0,
    )
  }

  private async attemptWithRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string,
    attempt: number,
  ): Promise<T> {
    await this.waitBeforeRetry(attempt)

    try {
      const result = await this.runRetryAttempt(
        operation,
        handleResponse,
        attempt,
      )
      if (!result.retry) {
        return result.value
      }

      return await this.attemptWithRetry(
        operation,
        handleResponse,
        errorContext,
        attempt + 1,
      )
    } catch (error) {
      const normalizedError = PplClient.normalizeRetryError(error)
      this.throwIfFinalAttempt(attempt, errorContext, normalizedError)
      return await this.attemptWithRetry(
        operation,
        handleResponse,
        errorContext,
        attempt + 1,
      )
    }
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    if (attempt === 0) {
      return
    }

    await sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  private async runRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    attempt: number,
  ): Promise<RetryAttemptResult<T>> {
    const response = await operation()

    if (PplClient.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
      return {
        error: new Error(`${response.status} - ${await response.text()}`),
        retry: true,
      }
    }

    return {
      retry: false,
      value: await handleResponse(response),
    }
  }

  private static normalizeRetryError(error: unknown): Error {
    if (error instanceof MedusaError) {
      throw error
    }

    return error instanceof Error ? error : new Error(String(error))
  }

  private throwIfFinalAttempt(
    attempt: number,
    errorContext: string,
    lastError: Error,
  ): void {
    if (attempt !== this.MAX_RETRIES) {
      return
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext} after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`,
    )
  }

  private async createBatchWithLocationHeader(
    token: string,
    path: string,
    body: unknown,
  ): Promise<string> {
    return await this.withRetry(
      async () =>
        await PplClient.fetchWithTimeout(`${this.baseUrl}${path}`, {
          body: JSON.stringify(body),
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          method: HTTP_METHODS.post,
        }),
      async (response) => {
        if (response.status !== 201) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `PPL batch creation failed: ${await response.text()}`,
          )
        }

        const batchId = response.headers
          .get("Location")
          ?.split("/")
          .findLast((part) => part.length > 0)
        if (batchId === undefined || batchId.length === 0) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "PPL: No batchId returned in Location header",
          )
        }
        return batchId
      },
      "PPL batch failed",
    )
  }

  private async get<T>(
    token: string,
    path: string,
    parse: ResponseParser<T>,
  ): Promise<T> {
    const { data } = await this.makeRequest(token, path, { parse })
    if (data === null) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL returned an empty response: ${path}`,
      )
    }
    return data
  }

  private async makeRequest<T>(
    token: string,
    path: string,
    options: RequestOptions<T>,
  ): Promise<{ data: T | null; status: number }> {
    const { method = HTTP_METHODS.get, body, allow404 = false, parse } = options

    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    }
    if (body !== undefined) {
      headers["Content-Type"] = "application/json"
    }

    const request: RequestInit = { headers, method }
    if (body !== undefined) {
      request.body = JSON.stringify(body)
    }

    return await this.withRetry(
      async () =>
        await PplClient.fetchWithTimeout(`${this.baseUrl}${path}`, request),
      async (response) => {
        if (allow404 && response.status === 404) {
          return { data: null, status: 404 }
        }

        // Accept any 2xx status, fail on 4xx/5xx
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `PPL request failed: ${response.status} - ${await response.text()}`,
          )
        }

        const text = await response.text()
        if (text.length === 0) {
          return { data: parse(null), status: response.status }
        }

        let value: unknown
        try {
          value = JSON.parse(text)
        } catch (error) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `PPL returned invalid JSON for ${path}: ${PplClient.normalizeRetryError(error).message}`,
          )
        }
        return { data: parse(value), status: response.status }
      },
      "PPL request failed",
    )
  }
}
