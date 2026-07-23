import type {
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

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

const isPplEnvironment = (value: unknown): value is PplEnvironment =>
  value === "testing" || value === "production"

const toPplConfigDTO = (value: unknown): PplConfigDTO => {
  if (
    !isRecord(value) ||
    typeof value["id"] !== "string" ||
    !isPplEnvironment(value["environment"]) ||
    typeof value["is_enabled"] !== "boolean" ||
    (value["client_id"] !== null && typeof value["client_id"] !== "string") ||
    (value["client_secret"] !== null &&
      typeof value["client_secret"] !== "string") ||
    typeof value["default_label_format"] !== "string" ||
    (value["cod_bank_account"] !== null &&
      typeof value["cod_bank_account"] !== "string") ||
    (value["cod_bank_code"] !== null &&
      typeof value["cod_bank_code"] !== "string") ||
    (value["cod_iban"] !== null && typeof value["cod_iban"] !== "string") ||
    (value["cod_swift"] !== null && typeof value["cod_swift"] !== "string") ||
    (value["sender_name"] !== null &&
      typeof value["sender_name"] !== "string") ||
    (value["sender_street"] !== null &&
      typeof value["sender_street"] !== "string") ||
    (value["sender_city"] !== null &&
      typeof value["sender_city"] !== "string") ||
    (value["sender_zip_code"] !== null &&
      typeof value["sender_zip_code"] !== "string") ||
    (value["sender_country"] !== null &&
      typeof value["sender_country"] !== "string") ||
    (value["sender_phone"] !== null &&
      typeof value["sender_phone"] !== "string") ||
    (value["sender_email"] !== null &&
      typeof value["sender_email"] !== "string") ||
    !(value["created_at"] instanceof Date) ||
    !(value["updated_at"] instanceof Date)
  ) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PPL: Stored configuration has an invalid shape"
    )
  }

  return {
    id: value["id"],
    environment: value["environment"],
    is_enabled: value["is_enabled"],
    client_id: value["client_id"],
    client_secret: value["client_secret"],
    default_label_format: value["default_label_format"],
    cod_bank_account: value["cod_bank_account"],
    cod_bank_code: value["cod_bank_code"],
    cod_iban: value["cod_iban"],
    cod_swift: value["cod_swift"],
    sender_name: value["sender_name"],
    sender_street: value["sender_street"],
    sender_city: value["sender_city"],
    sender_zip_code: value["sender_zip_code"],
    sender_country: value["sender_country"],
    sender_phone: value["sender_phone"],
    sender_email: value["sender_email"],
    created_at: value["created_at"],
    updated_at: value["updated_at"],
  }
}

/** How long this service waits for the rate limit lock before falling back. */
const LOCK_ACQUIRE_TIMEOUT_MS = 5000
/**
 * Backstop timeout passed to the locking provider so an abandoned lock wait
 * cannot keep queueing inside the provider forever. Deliberately longer than
 * LOCK_ACQUIRE_TIMEOUT_MS so this service's typed timeout always fires first.
 */
const LOCK_STALL_TIMEOUT_SECONDS = 10

/**
 * Typed discriminator for rate limit lock acquisition timeouts. The locking
 * providers only reject with plain `Error` values whose human-readable
 * messages differ per provider, so instead of branching on those messages the
 * service enforces its own acquisition timeout with this error class and
 * treats the provider timeout purely as a backstop.
 */
class RateLimitLockTimeoutError extends MedusaError {
  constructor() {
    super(
      MedusaError.Types.CONFLICT,
      "PPL: Timed out acquiring the rate limit lock"
    )
  }
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
    return decryptFields(toPplConfigDTO(config), [...PPL_SENSITIVE_FIELDS])
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
      return decryptFields(toPplConfigDTO(updated), [...PPL_SENSITIVE_FIELDS])
    }

    // Should not happen if loader ran, but create with environment just in case
    const created = await this.createPplConfigs({
      ...encrypted,
      environment: this.environment_,
    })
    await this.invalidateConfigCache()
    return decryptFields(toPplConfigDTO(created), [...PPL_SENSITIVE_FIELDS])
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
    const options: PplOptions = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      environment: this.environment_,
      default_label_format: config.default_label_format as PplLabelFormat,
    }
    const optionalFields = [
      "cod_bank_account",
      "cod_bank_code",
      "cod_iban",
      "cod_swift",
      "sender_name",
      "sender_street",
      "sender_city",
      "sender_zip_code",
      "sender_country",
      "sender_phone",
      "sender_email",
    ] as const

    for (const field of optionalFields) {
      const value = config[field]
      if (value !== null) {
        options[field] = value
      }
    }

    return options
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

      const lockExecution = lockingService.execute(
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
        { timeout: LOCK_STALL_TIMEOUT_SECONDS }
      )

      let acquisitionTimer: NodeJS.Timeout | undefined
      const acquisitionTimeout = new Promise<never>((_, reject) => {
        acquisitionTimer = setTimeout(() => {
          reject(new RateLimitLockTimeoutError())
        }, LOCK_ACQUIRE_TIMEOUT_MS)
        acquisitionTimer.unref?.()
      })

      try {
        await Promise.race([lockExecution, acquisitionTimeout])
      } catch (error) {
        // Lock timeout - fall through to local fallback for this request
        if (error instanceof RateLimitLockTimeoutError) {
          // Abandon the lock wait; the provider backstop timeout settles it.
          lockExecution.catch(() => undefined)
          this.logger_.warn(
            "PPL: Rate limit lock timed out, using local fallback"
          )
          return this.acquireLocalRateLimitSlot()
        }
        throw error
      } finally {
        if (acquisitionTimer !== undefined) {
          clearTimeout(acquisitionTimer)
        }
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

  async getEnvironment(): Promise<PplEnvironment> {
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
