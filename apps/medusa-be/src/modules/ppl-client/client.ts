import { OAuth2Client } from "@badgateway/oauth2-client"
import { MedusaError } from "@medusajs/framework/utils"
import type {
  PplAccessPoint,
  PplAccessPointsQuery,
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
  PplPaginatedResponse,
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
  testing: "https://api-dev.dhl.com/ecs/ppl/myapi2",
  production: "https://api.dhl.com/ecs/ppl/myapi2",
} as const

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  allow404?: boolean
}

type RetryAttemptResult<T> =
  | { retry: true; error: Error }
  | { retry: false; value: T }

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
  private oauth2Client: OAuth2Client | null = null

  private readonly MAX_RETRIES = 3
  private readonly INITIAL_RETRY_DELAY_MS = 200
  private readonly REQUEST_TIMEOUT_MS = 30_000 // 30 seconds

  private readonly options: PplOptions

  constructor(options: PplOptions) {
    this.options = options
    this.initOAuthClient()
  }

  private initOAuthClient(): void {
    this.oauth2Client = new OAuth2Client({
      server: this.baseUrl,
      tokenEndpoint: "/ecs/ppl/myapi2/login/getAccessToken",
      clientId: this.options.client_id,
      clientSecret: this.options.client_secret,
      authenticationMethod: "client_secret_post",
    })
  }

  private get baseUrl(): string {
    return BASE_URLS[this.options.environment]
  }

  /**
   * Fetch new OAuth token from PPL API
   * Called by service layer which handles caching/sharing
   */
  async fetchNewToken(): Promise<{ accessToken: string; expiresAt: number }> {
    if (!this.oauth2Client) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "PPL: OAuth2 client not initialized"
      )
    }

    const tokenResponse = await this.oauth2Client.clientCredentials({
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
    }
  ): Promise<string> {
    const body = {
      shipments,
      labelSettings: options?.labelSettings ?? {
        format: this.options.default_label_format,
        dpi: 300,
      },
      ...(options?.returnChannel && { returnChannel: options.returnChannel }),
      ...(options?.shipmentsOrderBy && {
        shipmentsOrderBy: options.shipmentsOrderBy,
      }),
    }

    return this.createBatchWithLocationHeader(token, "/shipment/batch", body)
  }

  async getBatchStatus(
    token: string,
    batchId: string
  ): Promise<PplBatchResponse> {
    return this.get<PplBatchResponse>(token, `/shipment/batch/${batchId}`)
  }

  async downloadLabel(token: string, labelUrl: string): Promise<Buffer> {
    const fullUrl = labelUrl.startsWith("http")
      ? labelUrl
      : `${this.baseUrl}${labelUrl}`

    const response = await this.fetchWithTimeout(fullUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL label download failed: ${response.status} - ${labelUrl}`
      )
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  async getShipmentInfo(
    token: string,
    query: PplShipmentQuery
  ): Promise<PplShipmentInfo[]> {
    const params = this.buildShipmentQueryParams(query)
    const { data } = await this.makeRequest<
      PplPaginatedResponse<PplShipmentInfo> | PplShipmentInfo[]
    >(token, `/shipment?${params}`)
    return Array.isArray(data) ? data : data?.items || []
  }

  async cancelShipment(
    token: string,
    shipmentNumber: string
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, `/shipment/${shipmentNumber}/cancel`, {
        method: "POST",
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
    query: PplAccessPointsQuery = {}
  ): Promise<PplAccessPoint[]> {
    const params = this.buildAccessPointQueryParams(query)
    const { data } = await this.makeRequest<
      PplPaginatedResponse<PplAccessPoint> | PplAccessPoint[]
    >(token, `/accessPoint?${params}`)
    return Array.isArray(data) ? data : data?.items || []
  }

  // ============================================
  // Address Whisper
  // ============================================

  async getAddressWhisper(
    token: string,
    query: PplAddressWhisperQuery
  ): Promise<PplAddressWhisperItem[]> {
    const params = new URLSearchParams()
    if (query.street) {
      params.append("Street", query.street)
    }
    if (query.zipCode) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.city) {
      params.append("City", query.city)
    }
    if (query.calledFrom) {
      params.append("CalledFrom", query.calledFrom)
    }

    const { data } = await this.makeRequest<
      { items: PplAddressWhisperItem[] } | PplAddressWhisperItem[]
    >(token, `/addressWhisper?${params}`)
    return Array.isArray(data) ? data : data?.items || []
  }

  // ============================================
  // Codelists
  // ============================================

  async getCodelistProducts(
    token: string,
    query: PplCodelistQuery = { limit: 100, offset: 0 }
  ): Promise<PplCodelistProduct[]> {
    return this.fetchCodelist<PplCodelistProduct>(token, "product", query)
  }

  async getCodelistCountries(
    token: string,
    query: PplCodelistQuery = { limit: 100, offset: 0 }
  ): Promise<PplCodelistCountry[]> {
    return this.fetchCodelist<PplCodelistCountry>(token, "country", query)
  }

  async getCodelistCurrencies(
    token: string,
    query: PplCodelistQuery = { limit: 100, offset: 0 }
  ): Promise<PplCodelistCurrency[]> {
    return this.fetchCodelist<PplCodelistCurrency>(token, "currency", query)
  }

  async getCodelistServices(
    token: string,
    query: PplCodelistQuery = { limit: 100, offset: 0 }
  ): Promise<PplCodelistServiceItem[]> {
    return this.fetchCodelist<PplCodelistServiceItem>(token, "service", query)
  }

  async getCodelistStatuses(
    token: string,
    query: PplCodelistQuery = { limit: 100, offset: 0 }
  ): Promise<PplCodelistStatus[]> {
    return this.fetchCodelist<PplCodelistStatus>(token, "status", query)
  }

  async getCodelistServicePriceLimits(
    token: string,
    query: PplServicePriceLimitQuery
  ): Promise<PplCodelistServicePriceLimit[]> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })
    if (query.service) {
      params.append("Service", query.service)
    }
    if (query.currency) {
      params.append("Currency", query.currency)
    }
    if (query.country) {
      params.append("Country", query.country)
    }
    if (query.product) {
      params.append("Product", query.product)
    }

    const { data } = await this.makeRequest<
      | PplPaginatedResponse<PplCodelistServicePriceLimit>
      | PplCodelistServicePriceLimit[]
    >(token, `/codelist/servicePriceLimit?${params}`)
    return Array.isArray(data) ? data : data?.items || []
  }

  // ============================================
  // Customer
  // ============================================

  async getCustomerInfo(token: string): Promise<PplCustomerInfo | null> {
    const { data, status } = await this.makeRequest<PplCustomerInfo>(
      token,
      "/customer",
      { allow404: true }
    )
    return status === 404 ? null : data
  }

  async getCustomerAddresses(
    token: string
  ): Promise<PplCustomerAddressResponse | null> {
    const { data, status } = await this.makeRequest<PplCustomerAddressResponse>(
      token,
      "/customer/address",
      { allow404: true }
    )
    return status === 404 ? null : data
  }

  // ============================================
  // Orders
  // ============================================

  async createOrderBatch(
    token: string,
    request: PplOrderBatchRequest
  ): Promise<string> {
    return this.createBatchWithLocationHeader(token, "/order/batch", request)
  }

  async getOrderBatchStatus(
    token: string,
    batchId: string
  ): Promise<PplOrderBatchResponse> {
    return this.get<PplOrderBatchResponse>(token, `/order/batch/${batchId}`)
  }

  async getOrders(token: string, query: PplOrderQuery): Promise<PplOrder[]> {
    const params = this.buildOrderQueryParams(query)
    const { data } = await this.makeRequest<
      PplPaginatedResponse<PplOrder> | PplOrder[]
    >(token, `/order?${params}`)
    return Array.isArray(data) ? data : data?.items || []
  }

  async cancelOrder(
    token: string,
    query: PplOrderCancelQuery,
    request?: PplOrderCancelRequest
  ): Promise<boolean> {
    const params = new URLSearchParams()
    if (query.customerReference) {
      params.append("CustomerReference", query.customerReference)
    }
    if (query.orderReference) {
      params.append("OrderReference", query.orderReference)
    }

    try {
      await this.makeRequest(token, `/order/cancel?${params}`, {
        method: "POST",
        body: request,
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
    request: PplBatchUpdateRequest
  ): Promise<void> {
    await this.makeRequest(token, `/shipment/batch/${batchId}`, {
      method: "PUT",
      body: request,
    })
  }

  async getBatchLabels(
    token: string,
    batchId: string,
    query: PplBatchLabelQuery
  ): Promise<PplBatchLabelResponse> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })
    if (query.pageSize) {
      params.append("PageSize", query.pageSize)
    }
    if (query.position) {
      params.append("Position", String(query.position))
    }
    if (query.orderBy) {
      params.append("OrderBy", query.orderBy)
    }

    return this.get<PplBatchLabelResponse>(
      token,
      `/shipment/batch/${batchId}/label?${params}`
    )
  }

  // ============================================
  // Shipment Redirect & Connect
  // ============================================

  async redirectShipment(
    token: string,
    shipmentNumber: string,
    request: PplShipmentRedirectRequest
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, `/shipment/${shipmentNumber}/redirect`, {
        method: "POST",
        body: request,
      })
      return true
    } catch {
      return false
    }
  }

  async connectShipmentSet(
    token: string,
    request: PplConnectSetRequest
  ): Promise<boolean> {
    try {
      await this.makeRequest(token, "/shipment/batch/connectSet", {
        method: "POST",
        body: request,
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
    query: PplRoutingQuery
  ): Promise<PplRoutingResponse> {
    const params = new URLSearchParams({ Country: query.country })
    if (query.parcelShopCode) {
      params.append("ParcelShopCode", query.parcelShopCode)
    }
    if (query.street) {
      params.append("Street", query.street)
    }
    if (query.city) {
      params.append("City", query.city)
    }
    if (query.zipCode) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.productType) {
      params.append("ProductType", query.productType)
    }

    return this.get<PplRoutingResponse>(token, `/routing?${params}`)
  }

  async getVersionInformation(
    token: string
  ): Promise<PplVersionInformationResponse> {
    return this.get<PplVersionInformationResponse>(token, "/versionInformation")
  }

  async getApiInfo(token: string): Promise<PplApiInfo> {
    return this.get<PplApiInfo>(token, "/info")
  }

  // ============================================
  // Internal Helpers
  // ============================================

  private buildShipmentQueryParams(query: PplShipmentQuery): URLSearchParams {
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

    if (query.dateFrom) {
      params.append("DateFrom", query.dateFrom)
    }
    if (query.dateTo) {
      params.append("DateTo", query.dateTo)
    }

    return params
  }

  private buildAccessPointQueryParams(
    query: PplAccessPointsQuery
  ): URLSearchParams {
    const params = new URLSearchParams({
      Limit: String(query.limit ?? 1000),
      Offset: String(query.offset ?? 0),
    })

    if (query.accessPointCode) {
      params.append("AccessPointCode", query.accessPointCode)
    }
    if (query.countryCode) {
      params.append("CountryCode", query.countryCode)
    }
    if (query.zipCode) {
      params.append("ZipCode", query.zipCode)
    }
    if (query.city) {
      params.append("City", query.city)
    }
    if (query.accessPointTypes) {
      params.append("AccessPointTypes", query.accessPointTypes)
    }
    if (query.radius) {
      params.append("Radius", String(query.radius))
    }
    if (query.latitude) {
      params.append("Latitude", String(query.latitude))
    }
    if (query.longitude) {
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
    if (query.sizes) {
      params.append("Sizes", query.sizes)
    }

    return params
  }

  private buildOrderQueryParams(query: PplOrderQuery): URLSearchParams {
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

    if (query.dateFrom) {
      params.append("DateFrom", query.dateFrom)
    }
    if (query.dateTo) {
      params.append("DateTo", query.dateTo)
    }
    if (query.sendDate) {
      params.append("SendDate", query.sendDate)
    }
    if (query.productType) {
      params.append("ProductType", query.productType)
    }

    return params
  }

  private async fetchCodelist<T>(
    token: string,
    codelistName: string,
    query: PplCodelistQuery
  ): Promise<T[]> {
    const params = new URLSearchParams({
      Limit: String(query.limit),
      Offset: String(query.offset),
    })

    const { data } = await this.makeRequest<PplPaginatedResponse<T> | T[]>(
      token,
      `/codelist/${codelistName}?${params}`
    )
    return Array.isArray(data) ? data : data?.items || []
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number = this.REQUEST_TIMEOUT_MS
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `PPL request timed out after ${timeoutMs}ms: ${url}`
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private isRetryable(status: number): boolean {
    return status === 429 || status >= 500
  }

  private async withRetry<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    errorContext: string
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      await this.waitBeforeRetry(attempt)

      try {
        const result = await this.runRetryAttempt(
          operation,
          handleResponse,
          attempt
        )
        if (result.retry) {
          lastError = result.error
          continue
        }

        return result.value
      } catch (error) {
        lastError = this.normalizeRetryError(error)
        this.throwIfFinalAttempt(attempt, errorContext, lastError)
      }
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext}: ${lastError?.message || "Unknown error"}`
    )
  }

  private async waitBeforeRetry(attempt: number): Promise<void> {
    if (attempt === 0) {
      return
    }

    await this.sleep(this.INITIAL_RETRY_DELAY_MS * 2 ** (attempt - 1))
  }

  private async runRetryAttempt<T>(
    operation: () => Promise<Response>,
    handleResponse: (response: Response) => Promise<T>,
    attempt: number
  ): Promise<RetryAttemptResult<T>> {
    const response = await operation()

    if (this.isRetryable(response.status) && attempt < this.MAX_RETRIES) {
      return {
        retry: true,
        error: new Error(`${response.status} - ${await response.text()}`),
      }
    }

    return {
      retry: false,
      value: await handleResponse(response),
    }
  }

  private normalizeRetryError(error: unknown): Error {
    if (error instanceof MedusaError) {
      throw error
    }

    return error instanceof Error ? error : new Error(String(error))
  }

  private throwIfFinalAttempt(
    attempt: number,
    errorContext: string,
    lastError: Error
  ): void {
    if (attempt !== this.MAX_RETRIES) {
      return
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${errorContext} after ${this.MAX_RETRIES + 1} attempts: ${lastError.message}`
    )
  }

  private async createBatchWithLocationHeader(
    token: string,
    path: string,
    body: unknown
  ): Promise<string> {
    return this.withRetry(
      () =>
        this.fetchWithTimeout(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        }),
      async (response) => {
        if (response.status !== 201) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `PPL batch creation failed: ${await response.text()}`
          )
        }

        const batchId = response.headers
          .get("Location")
          ?.split("/")
          .filter(Boolean)
          .pop()
        if (!batchId) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "PPL: No batchId returned in Location header"
          )
        }
        return batchId
      },
      "PPL batch failed"
    )
  }

  private async get<T>(token: string, path: string): Promise<T> {
    const { data } = await this.makeRequest<T>(token, path)
    return data as T
  }

  private async makeRequest<T>(
    token: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<{ data: T | null; status: number }> {
    const { method = "GET", body, allow404 = false } = options

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }
    if (body) {
      headers["Content-Type"] = "application/json"
    }

    return this.withRetry(
      () =>
        this.fetchWithTimeout(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        }),
      async (response) => {
        if (allow404 && response.status === 404) {
          return { data: null, status: 404 }
        }

        // Accept any 2xx status, fail on 4xx/5xx
        if (!response.ok) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            `PPL request failed: ${response.status} - ${await response.text()}`
          )
        }

        const text = await response.text()
        const data = text ? (JSON.parse(text) as T) : null
        return { data, status: response.status }
      },
      "PPL request failed"
    )
  }
}
