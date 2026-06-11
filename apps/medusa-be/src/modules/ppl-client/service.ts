import type {
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { PplClient } from "./client"
import PplConfig from "./models/ppl-config"
import {
  PPL_SENSITIVE_FIELDS,
  type PplAccessPoint,
  type PplAccessPointsQuery,
  type PplBatchResponse,
  type PplCodelistCountry,
  type PplCodelistCurrency,
  type PplCodelistProduct,
  type PplCodelistServiceItem,
  type PplCodelistStatus,
  type PplConfigDTO,
  type PplCustomerAddressResponse,
  type PplCustomerInfo,
  type PplEnvironment,
  type PplLabelFormat,
  type PplLabelSettings,
  type PplOptions,
  type PplReturnChannel,
  type PplShipmentInfo,
  type PplShipmentQuery,
  type PplShipmentRequest,
  type UpdatePplConfigInput,
} from "./types"

// ============================================
// Cache Configuration
// ============================================

const CACHE_KEYS = {
  TOKEN: "ppl:oauth:token",
  RATE_LIMIT: "ppl:rate:last_request",
  COUNTRIES: "ppl:codelist:countries",
  CURRENCIES: "ppl:codelist:currencies",
  PRODUCTS: "ppl:codelist:products",
  SERVICES: "ppl:codelist:services",
  STATUSES: "ppl:codelist:statuses",
  CONFIG: "ppl:config",
} as const

const LOCK_KEYS = {
  RATE_LIMIT: "ppl:rate_limit_lock",
} as const

const CACHE_TAGS = {
  ALL: "ppl",
  CODELISTS: "ppl:codelists",
} as const

const CACHE_TTL = {
  CODELISTS: 3600, // 1 hour
  RATE_LIMIT: 1, // 1 second
  CONFIG: 60, // 60 seconds for config (lazy reload)
} as const

const MIN_REQUEST_INTERVAL_MS = 40
const TOKEN_BUFFER_MS = 60_000

type InjectedDependencies = {
  logger: Logger
  [Modules.CACHING]?: ICachingModuleService
  [Modules.LOCKING]?: ILockingModule
}

type CachedToken = {
  accessToken: string
  expiresAt: number
}

type UsablePplConfig = PplConfigDTO & {
  client_id: string
  client_secret: string
}

/**
 * Module options passed from medusa-config.ts
 */
type PplModuleOptions = {
  environment: PplEnvironment
}

/**
 * PPL Client Module Service
 *
 * Manages the PPL API client lifecycle and provides:
 * - DB-stored configuration with encryption for sensitive fields
 * - Distributed rate limiting via Redis (prioritized)
 * - Shared OAuth token across containers via Redis
 * - Cached codelists with tag-based invalidation
 * - Lazy client initialization (re-created when config changes)
 * - Local fallback only when Redis is unavailable
 *
 * This module is only registered when FEATURE_PPL_ENABLED=1.
 * Config is stored in DB - admin enables/disables via Settings → PPL.
 */
export class PplClientModuleService extends MedusaService({ PplConfig }) {
  private client_: PplClient | null = null
  private readonly logger_: Logger
  private readonly cacheService_: ICachingModuleService | null
  private readonly lockingService_: ILockingModule | null
  private readonly environment_: PplEnvironment

  // Local fallback state (only used when Redis unavailable)
  private fallbackToken_: string | null = null
  private fallbackTokenExpiresAt_ = 0
  private fallbackLastRequestTime_ = 0

  constructor(container: InjectedDependencies, options: PplModuleOptions) {
    super(container, options)

    this.logger_ = container.logger
    this.environment_ = options.environment

    this.cacheService_ = safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )
    this.lockingService_ = safeResolve<ILockingModule>(
      container,
      Modules.LOCKING
    )

    if (!(this.cacheService_ && this.lockingService_)) {
      this.logger_.warn(
        "PPL: Cache or locking service not available. Using local-only mode (not suitable for multi-container)."
      )
    }

    this.logger_.info(
      `PPL: Module service initialized (${this.environment_} environment)`
    )
  }

  // ============================================
  // Config Management (DB-stored)
  // ============================================

  /**
   * Get config for current environment (decrypted)
   */
  async getConfig(): Promise<PplConfigDTO | null> {
    const configs = await this.listPplConfigs(
      { environment: this.environment_ },
      { take: 1 }
    )
    const config = configs[0]
    if (!config) {
      return null
    }
    return decryptFields(config as unknown as PplConfigDTO, [
      ...PPL_SENSITIVE_FIELDS,
    ])
  }

  /**
   * Update config for current environment
   * Empty string for sensitive fields = keep existing value
   * null for sensitive fields = clear the value
   */
  async updateConfig(data: UpdatePplConfigInput): Promise<PplConfigDTO> {
    const existing = await this.getConfig()

    // Handle sensitive fields: empty string = keep, null = clear
    const filteredData = { ...data }
    for (const field of PPL_SENSITIVE_FIELDS) {
      const key = field as keyof UpdatePplConfigInput
      if (filteredData[key] === "") {
        delete filteredData[key]
      }
      // null is kept as-is to clear the value
    }

    // Encrypt sensitive fields
    const encrypted = encryptFields(filteredData, [...PPL_SENSITIVE_FIELDS])

    if (existing) {
      const updated = await this.updatePplConfigs({
        id: existing.id,
        ...encrypted,
      })
      await this.invalidateConfigCache()
      return decryptFields(updated as unknown as PplConfigDTO, [
        ...PPL_SENSITIVE_FIELDS,
      ])
    }

    // Should not happen if loader ran, but create with environment just in case
    const created = await this.createPplConfigs({
      ...encrypted,
      environment: this.environment_,
    })
    await this.invalidateConfigCache()
    return decryptFields(created as unknown as PplConfigDTO, [
      ...PPL_SENSITIVE_FIELDS,
    ])
  }

  /**
   * Get effective config for API calls (from DB with caching)
   * Returns null if PPL is disabled or not configured
   */
  async getEffectiveConfig(): Promise<PplOptions | null> {
    const cached = await this.getCachedEffectiveConfig()
    if (cached) {
      return cached
    }

    const config = await this.getConfig()
    if (!this.isConfigUsable(config)) {
      return null
    }

    const options = this.buildEffectiveOptions(config)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedEffectiveConfig(): Promise<PplOptions | null> {
    if (!this.cacheService_) {
      return null
    }

    const cached = await this.cacheService_.get({ key: CACHE_KEYS.CONFIG })

    return cached ? (cached as PplOptions) : null
  }

  private isConfigUsable(
    config: PplConfigDTO | null | undefined
  ): config is UsablePplConfig {
    return Boolean(
      config?.is_enabled && config.client_id && config.client_secret
    )
  }

  private buildEffectiveOptions(config: UsablePplConfig): PplOptions {
    return {
      client_id: config.client_id,
      client_secret: config.client_secret,
      environment: this.environment_,
      default_label_format: config.default_label_format as PplLabelFormat,
      cod_bank_account: config.cod_bank_account ?? undefined,
      cod_bank_code: config.cod_bank_code ?? undefined,
      cod_iban: config.cod_iban ?? undefined,
      cod_swift: config.cod_swift ?? undefined,
      sender_name: config.sender_name ?? undefined,
      sender_street: config.sender_street ?? undefined,
      sender_city: config.sender_city ?? undefined,
      sender_zip_code: config.sender_zip_code ?? undefined,
      sender_country: config.sender_country ?? undefined,
      sender_phone: config.sender_phone ?? undefined,
      sender_email: config.sender_email ?? undefined,
    }
  }

  private async cacheEffectiveConfig(options: PplOptions): Promise<void> {
    if (!this.cacheService_) {
      return
    }

    await this.cacheService_.set({
      key: CACHE_KEYS.CONFIG,
      data: options,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  /**
   * Invalidate config cache (call after config update)
   */
  async invalidateConfigCache(): Promise<void> {
    this.client_ = null // Force client re-init
    if (this.cacheService_) {
      await this.cacheService_.clear({ key: CACHE_KEYS.CONFIG })
    }
  }

  // ============================================
  // Lazy Client Initialization
  // ============================================

  private async getClient(): Promise<PplClient> {
    if (this.client_) {
      return this.client_
    }

    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL is disabled or not configured. Enable it in Settings → PPL."
      )
    }

    this.client_ = new PplClient(config)
    return this.client_
  }

  // ============================================
  // Token Management (Redis prioritized)
  // ============================================

  private async getToken(): Promise<string> {
    // Redis available - use distributed token
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: CACHE_KEYS.TOKEN,
      })) as CachedToken | null

      if (cached && cached.expiresAt > Date.now() + TOKEN_BUFFER_MS) {
        this.logger_.debug("PPL: Using shared OAuth token from Redis")
        return cached.accessToken
      }

      // Need new token - acquire rate limit slot first
      await this.acquireRateLimitSlot()

      const { accessToken, expiresAt } =
        await this.fetchTokenWithErrorHandling()

      // Store in Redis
      const ttlSeconds = Math.max(
        1,
        Math.floor((expiresAt - Date.now()) / 1000) - 60
      )
      await this.cacheService_.set({
        key: CACHE_KEYS.TOKEN,
        data: { accessToken, expiresAt } satisfies CachedToken,
        ttl: ttlSeconds,
        tags: [CACHE_TAGS.ALL],
      })
      this.logger_.debug("PPL: Stored OAuth token in Redis")

      return accessToken
    }

    // Fallback: Local-only mode (Redis unavailable)
    if (
      this.fallbackToken_ &&
      this.fallbackTokenExpiresAt_ > Date.now() + TOKEN_BUFFER_MS
    ) {
      return this.fallbackToken_
    }

    await this.acquireRateLimitSlot()

    const tokenResult = await this.fetchTokenWithErrorHandling()
    this.fallbackToken_ = tokenResult.accessToken
    this.fallbackTokenExpiresAt_ = tokenResult.expiresAt

    return tokenResult.accessToken
  }

  private async fetchTokenWithErrorHandling(): Promise<{
    accessToken: string
    expiresAt: number
  }> {
    try {
      const client = await this.getClient()
      const result = await client.fetchNewToken()
      this.logger_.debug("PPL: OAuth token obtained/refreshed")
      return result
    } catch (error) {
      this.logger_.error(
        "PPL auth failed",
        error instanceof Error ? error : new Error(String(error))
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL authentication failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  // ============================================
  // Rate Limiting (Redis prioritized, atomic)
  // ============================================

  private async acquireRateLimitSlot(): Promise<void> {
    const cacheService = this.cacheService_
    const lockingService = this.lockingService_

    // Distributed mode: use locking for atomic check-and-set
    if (cacheService && lockingService) {
      let waitTime = 0

      try {
        await lockingService.execute(
          LOCK_KEYS.RATE_LIMIT,
          async () => {
            const now = Date.now()
            const cached = (await cacheService.get({
              key: CACHE_KEYS.RATE_LIMIT,
            })) as { timestamp: number } | null

            if (cached && now - cached.timestamp < MIN_REQUEST_INTERVAL_MS) {
              waitTime = MIN_REQUEST_INTERVAL_MS - (now - cached.timestamp)
            }

            // Reserve our slot by writing the future timestamp
            const slotTime = now + waitTime
            await cacheService.set({
              key: CACHE_KEYS.RATE_LIMIT,
              data: { timestamp: slotTime },
              ttl: CACHE_TTL.RATE_LIMIT,
            })
          },
          { timeout: 5 }
        )
      } catch (error) {
        // Lock timeout - fall through to local fallback for this request
        if (error instanceof Error && error.message.includes("Timed-out")) {
          this.logger_.warn(
            "PPL: Rate limit lock timed out, using local fallback"
          )
          return this.acquireLocalRateLimitSlot()
        }
        throw error
      }

      // Sleep outside the lock to minimize lock hold time
      if (waitTime > 0) {
        await this.sleep(waitTime)
      }
      return
    }

    // Fallback: Local-only mode (Redis/locking unavailable)
    return this.acquireLocalRateLimitSlot()
  }

  private async acquireLocalRateLimitSlot(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this.fallbackLastRequestTime_
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await this.sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
    }
    this.fallbackLastRequestTime_ = Date.now()
  }

  // ============================================
  // Cache Helpers
  // ============================================

  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[]
  ): Promise<T> {
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({ key })) as T | null
      if (cached !== null) {
        this.logger_.debug(`PPL: Cache hit for ${key}`)
        return cached
      }
    }

    const data = await fetcher()

    if (this.cacheService_ && data !== null) {
      await this.cacheService_.set({ key, data: data as object, ttl, tags })
      this.logger_.debug(`PPL: Cached ${key}`)
    }

    return data
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // ============================================
  // Public API: Configuration
  // ============================================

  getEnvironment(): PplEnvironment {
    return this.environment_
  }

  // ============================================
  // Public API: Cache Invalidation
  // ============================================

  async invalidateCodelists(): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.clear({ tags: [CACHE_TAGS.CODELISTS] })
    this.logger_.info("PPL: Invalidated codelist cache")
  }

  async invalidateAllCaches(): Promise<void> {
    if (!this.cacheService_) {
      // Clear local fallback
      this.fallbackToken_ = null
      this.fallbackTokenExpiresAt_ = 0
      return
    }

    await this.cacheService_.clear({ tags: [CACHE_TAGS.ALL] })
    this.logger_.info("PPL: Invalidated all caches")
  }

  // ============================================
  // Public API: Shipment Operations
  // ============================================

  async createShipmentBatch(
    shipments: PplShipmentRequest[],
    options?: {
      labelSettings?: PplLabelSettings
      returnChannel?: PplReturnChannel
      shipmentsOrderBy?: string
    }
  ): Promise<string> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    return client.createShipmentBatch(token, shipments, options)
  }

  async getBatchStatus(batchId: string): Promise<PplBatchResponse> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    return client.getBatchStatus(token, batchId)
  }

  async downloadLabel(labelUrl: string): Promise<Buffer> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    return client.downloadLabel(token, labelUrl)
  }

  async getShipmentInfo(query: PplShipmentQuery): Promise<PplShipmentInfo[]> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    return client.getShipmentInfo(token, query)
  }

  async cancelShipment(shipmentNumber: string): Promise<boolean> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    const result = await client.cancelShipment(token, shipmentNumber)
    if (result) {
      this.logger_.info(`PPL: Shipment ${shipmentNumber} cancelled`)
    } else {
      this.logger_.warn(`PPL: Cancellation failed for ${shipmentNumber}`)
    }
    return result
  }

  // ============================================
  // Public API: Access Points
  // ============================================

  async getAccessPoints(
    query: PplAccessPointsQuery = {}
  ): Promise<PplAccessPoint[]> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    return client.getAccessPoints(token, query)
  }

  // ============================================
  // Public API: Cached Codelists
  // ============================================

  async getCachedCountries(): Promise<PplCodelistCountry[]> {
    return this.getCached(
      CACHE_KEYS.COUNTRIES,
      async () => {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        const client = await this.getClient()
        return client.getCodelistCountries(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  async getCachedCurrencies(): Promise<PplCodelistCurrency[]> {
    return this.getCached(
      CACHE_KEYS.CURRENCIES,
      async () => {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        const client = await this.getClient()
        return client.getCodelistCurrencies(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  async getCachedProducts(): Promise<PplCodelistProduct[]> {
    return this.getCached(
      CACHE_KEYS.PRODUCTS,
      async () => {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        const client = await this.getClient()
        return client.getCodelistProducts(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  async getCachedServices(): Promise<PplCodelistServiceItem[]> {
    return this.getCached(
      CACHE_KEYS.SERVICES,
      async () => {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        const client = await this.getClient()
        return client.getCodelistServices(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  async getCachedStatuses(): Promise<PplCodelistStatus[]> {
    return this.getCached(
      CACHE_KEYS.STATUSES,
      async () => {
        await this.acquireRateLimitSlot()
        const token = await this.getToken()
        const client = await this.getClient()
        return client.getCodelistStatuses(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  // ============================================
  // Public API: Customer Data (not cached)
  // ============================================

  async getCustomerInfo(): Promise<PplCustomerInfo | null> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    const result = await client.getCustomerInfo(token)
    if (!result) {
      this.logger_.warn(
        "PPL: No customer profile configured for these credentials"
      )
    }
    return result
  }

  async getCustomerAddresses(): Promise<PplCustomerAddressResponse | null> {
    await this.acquireRateLimitSlot()
    const token = await this.getToken()
    const client = await this.getClient()
    const result = await client.getCustomerAddresses(token)
    if (!result) {
      this.logger_.warn("PPL: Customer has no address configured in PPL system")
    }
    return result
  }
}
