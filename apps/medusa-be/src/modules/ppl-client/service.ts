import type {
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { sleep } from "@techsio/std/async"
import { getErrorMessage, isRecord } from "@techsio/std/object"

import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { PplClient } from "./client"
import PplConfig from "./models/ppl-config"
import { PPL_SENSITIVE_FIELDS } from "./types"
import type {
  PplAccessPoint,
  PplAccessPointsQuery,
  PplBatchResponse,
  PplCodelistCountry,
  PplCodelistCurrency,
  PplCodelistProduct,
  PplCodelistServiceItem,
  PplCodelistStatus,
  PplConfigDTO,
  PplCustomerAddressResponse,
  PplCustomerInfo,
  PplEnvironment,
  PplLabelFormat,
  PplLabelSettings,
  PplOptions,
  PplReturnChannel,
  PplShipmentInfo,
  PplShipmentQuery,
  PplShipmentRequest,
  UpdatePplConfigInput,
} from "./types"

// ============================================
// Cache Configuration
// ============================================

const CACHE_KEYS = {
  CONFIG: "ppl:config",
  COUNTRIES: "ppl:codelist:countries",
  CURRENCIES: "ppl:codelist:currencies",
  PRODUCTS: "ppl:codelist:products",
  RATE_LIMIT: "ppl:rate:last_request",
  SERVICES: "ppl:codelist:services",
  STATUSES: "ppl:codelist:statuses",
  TOKEN: "ppl:oauth:token",
} as const

const LOCK_KEYS = {
  RATE_LIMIT: "ppl:rate_limit_lock",
} as const

const CACHE_TAGS = {
  ALL: "ppl",
  CODELISTS: "ppl:codelists",
} as const

const CACHE_TTL = {
  /** 1 hour */
  CODELISTS: 3600,
  /** 60 seconds for config (lazy reload) */
  CONFIG: 60,
  /** 1 second */
  RATE_LIMIT: 1,
} as const

const MIN_REQUEST_INTERVAL_MS = 40
const TOKEN_BUFFER_MS = 60_000
const TOKEN_TTL_SAFETY_SECONDS = 60
const MILLISECONDS_PER_SECOND = 1000

type CachingDependency = Pick<ICachingModuleService, "clear" | "get" | "set">
type LockingDependency = Pick<ILockingModule, "execute">

interface InjectedDependencies {
  logger: Logger
  [Modules.CACHING]?: CachingDependency
  [Modules.LOCKING]?: LockingDependency
}

const isCachingDependency = (value: unknown): value is CachingDependency =>
  isRecord(value) &&
  typeof value["clear"] === "function" &&
  typeof value["get"] === "function" &&
  typeof value["set"] === "function"

const isLockingDependency = (value: unknown): value is LockingDependency =>
  isRecord(value) && typeof value["execute"] === "function"

interface CachedToken {
  accessToken: string
  expiresAt: number
}

interface RateLimitSlot {
  timestamp: number
}

/** A rate-limited client paired with the OAuth token to call it with. */
interface AuthorizedClient {
  client: PplClient
  token: string
}

type UsablePplConfig = PplConfigDTO & {
  client_id: string
  client_secret: string
}

// ============================================
// Runtime validation of externally stored data
// ============================================

const isPplEnvironment = (value: unknown): value is PplEnvironment =>
  value === "testing" || value === "production"

const LABEL_FORMATS: ReadonlySet<string> = new Set<PplLabelFormat>([
  "Jpeg",
  "Pdf",
  "Png",
  "Svg",
  "Zpl",
])

const DEFAULT_LABEL_FORMAT: PplLabelFormat = "Pdf"

const isPplLabelFormat = (value: string): value is PplLabelFormat =>
  LABEL_FORMATS.has(value)

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string"

const isNonEmptyString = (value: string | null): value is string =>
  value !== null && value.length > 0

const NULLABLE_STRING_CONFIG_FIELDS = [
  "client_id",
  "client_secret",
  "cod_bank_account",
  "cod_bank_code",
  "cod_iban",
  "cod_swift",
  "sender_city",
  "sender_country",
  "sender_email",
  "sender_name",
  "sender_phone",
  "sender_street",
  "sender_zip_code",
] as const

const hasConfigIdentity = (record: Record<string, unknown>): boolean =>
  typeof record["id"] === "string" &&
  isPplEnvironment(record["environment"]) &&
  typeof record["is_enabled"] === "boolean" &&
  typeof record["default_label_format"] === "string"

const hasConfigTimestamps = (record: Record<string, unknown>): boolean =>
  record["created_at"] instanceof Date && record["updated_at"] instanceof Date

const hasConfigNullableStrings = (record: Record<string, unknown>): boolean =>
  NULLABLE_STRING_CONFIG_FIELDS.every((field) =>
    isNullableString(record[field]),
  )

const isStoredPplConfig = (value: unknown): value is PplConfigDTO =>
  isRecord(value) &&
  hasConfigIdentity(value) &&
  hasConfigTimestamps(value) &&
  hasConfigNullableStrings(value)

const toPplConfigDTO = (value: unknown): PplConfigDTO => {
  if (!isStoredPplConfig(value)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "PPL: Stored configuration has an invalid shape",
    )
  }

  return {
    client_id: value.client_id,
    client_secret: value.client_secret,
    cod_bank_account: value.cod_bank_account,
    cod_bank_code: value.cod_bank_code,
    cod_iban: value.cod_iban,
    cod_swift: value.cod_swift,
    created_at: value.created_at,
    default_label_format: value.default_label_format,
    environment: value.environment,
    id: value.id,
    is_enabled: value.is_enabled,
    sender_city: value.sender_city,
    sender_country: value.sender_country,
    sender_email: value.sender_email,
    sender_name: value.sender_name,
    sender_phone: value.sender_phone,
    sender_street: value.sender_street,
    sender_zip_code: value.sender_zip_code,
    updated_at: value.updated_at,
  }
}

const isCachedToken = (value: unknown): value is CachedToken =>
  isRecord(value) &&
  typeof value["accessToken"] === "string" &&
  typeof value["expiresAt"] === "number"

const isRateLimitSlot = (value: unknown): value is RateLimitSlot =>
  isRecord(value) && typeof value["timestamp"] === "number"

const isPplOptions = (value: unknown): value is PplOptions =>
  isRecord(value) &&
  typeof value["client_id"] === "string" &&
  typeof value["client_secret"] === "string" &&
  isPplEnvironment(value["environment"])

const hasCodelistCode = (value: unknown): boolean =>
  isRecord(value) && typeof value["code"] === "string"

const isCodelistArray = <TItem>(value: unknown): value is TItem[] =>
  Array.isArray(value) && value.every(hasCodelistCode)

const isConfigUsable = (
  config: PplConfigDTO | null,
): config is UsablePplConfig =>
  config !== null &&
  config.is_enabled &&
  isNonEmptyString(config.client_id) &&
  isNonEmptyString(config.client_secret)

/**
 * Structural view of the update payload. `encryptFields` accepts a
 * `Record<string, unknown>`, which an `interface` type does not satisfy, so the
 * payload is carried as an anonymous object type.
 */
type UpdatePplConfigPayload = {
  [TKey in keyof UpdatePplConfigInput]: UpdatePplConfigInput[TKey]
}

/**
 * Empty string on a sensitive field means "keep the stored value", so the
 * field is removed from the update payload. `null` is kept as-is because it
 * clears the stored value. Keys are removed statically to keep the payload
 * type intact.
 */
const dropBlankSensitiveFields = (
  data: UpdatePplConfigInput,
): UpdatePplConfigPayload => {
  const filtered: UpdatePplConfigPayload = { ...data }

  if (filtered.client_secret === "") {
    delete filtered.client_secret
  }
  if (filtered.cod_bank_account === "") {
    delete filtered.cod_bank_account
  }
  if (filtered.cod_bank_code === "") {
    delete filtered.cod_bank_code
  }
  if (filtered.cod_iban === "") {
    delete filtered.cod_iban
  }
  if (filtered.cod_swift === "") {
    delete filtered.cod_swift
  }

  return filtered
}

// ============================================
// Distributed rate limit slot reservation
// ============================================

/** How long this service waits for the rate limit lock before falling back. */
const LOCK_ACQUIRE_TIMEOUT_MS = 5000
/**
 * Backstop timeout passed to the locking provider so an abandoned lock wait
 * cannot keep queueing inside the provider forever. Deliberately longer than
 * LOCK_ACQUIRE_TIMEOUT_MS so this service's typed timeout always fires first.
 */
const LOCK_STALL_TIMEOUT_SECONDS = 10

/**
 * Typed discriminator for rate limit lock acquisition results. The locking
 * providers only reject with plain `Error` values whose human-readable
 * messages differ per provider, so instead of branching on those messages the
 * service enforces its own acquisition timeout and treats the provider timeout
 * purely as a backstop.
 */
type LockOutcome =
  | { status: "acquired"; waitTime: number }
  | { status: "failed"; error: unknown }
  | { status: "timeout" }

/**
 * Reserves the next request slot under the distributed lock. Provider failures
 * are returned instead of thrown so an abandoned wait can never surface as an
 * unhandled rejection; the caller rethrows the original error unchanged.
 */
const reserveRateLimitSlot = async (
  cacheService: CachingDependency,
  lockingService: LockingDependency,
): Promise<LockOutcome> => {
  try {
    const waitTime = await lockingService.execute(
      LOCK_KEYS.RATE_LIMIT,
      async () => {
        const now = Date.now()
        const stored: unknown = await cacheService.get({
          key: CACHE_KEYS.RATE_LIMIT,
        })
        const elapsed = isRateLimitSlot(stored)
          ? now - stored.timestamp
          : Number.POSITIVE_INFINITY
        const wait =
          elapsed < MIN_REQUEST_INTERVAL_MS
            ? MIN_REQUEST_INTERVAL_MS - elapsed
            : 0

        // Reserve our slot by writing the future timestamp
        await cacheService.set({
          data: { timestamp: now + wait },
          key: CACHE_KEYS.RATE_LIMIT,
          ttl: CACHE_TTL.RATE_LIMIT,
        })

        return wait
      },
      { timeout: LOCK_STALL_TIMEOUT_SECONDS },
    )

    return { status: "acquired", waitTime }
  } catch (error) {
    return { error, status: "failed" }
  }
}

/**
 * Races the lock reservation against this service's own acquisition timeout so
 * a stalled provider degrades to the local fallback instead of blocking.
 */
const acquireDistributedSlot = async (
  cacheService: CachingDependency,
  lockingService: LockingDependency,
): Promise<LockOutcome> => {
  const { promise: expiry, resolve: expire } =
    Promise.withResolvers<LockOutcome>()
  const acquisitionTimer = setTimeout(() => {
    expire({ status: "timeout" })
  }, LOCK_ACQUIRE_TIMEOUT_MS)
  acquisitionTimer.unref?.()

  try {
    return await Promise.race([
      reserveRateLimitSlot(cacheService, lockingService),
      expiry,
    ])
  } finally {
    clearTimeout(acquisitionTimer)
  }
}

/**
 * Module options passed from medusa-config.ts
 */
interface PplModuleOptions {
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
  private _client: PplClient | null = null
  private readonly _logger: Logger
  private readonly _cacheService: CachingDependency | null
  private readonly _lockingService: LockingDependency | null
  private readonly _environment: PplEnvironment

  // Local fallback state (only used when Redis unavailable)
  private _fallbackToken: string | null = null
  private _fallbackTokenExpiresAt = 0
  private _fallbackLastRequestTime = 0

  constructor(container: InjectedDependencies, options: PplModuleOptions) {
    super(container, options)

    this._logger = container.logger
    this._environment = options.environment

    this._cacheService = safeResolve(
      container,
      Modules.CACHING,
      isCachingDependency,
    )
    this._lockingService = safeResolve(
      container,
      Modules.LOCKING,
      isLockingDependency,
    )

    if (!(this._cacheService && this._lockingService)) {
      this._logger.warn(
        "PPL: Cache or locking service not available. Using local-only mode (not suitable for multi-container).",
      )
    }

    this._logger.info(
      `PPL: Module service initialized (${this._environment} environment)`,
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
      { environment: this._environment },
      { take: 1 },
    )
    const [config] = configs
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

    // Encrypt sensitive fields
    const encrypted = encryptFields(dropBlankSensitiveFields(data), [
      ...PPL_SENSITIVE_FIELDS,
    ])

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
      environment: this._environment,
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
    if (!isConfigUsable(config)) {
      return null
    }

    const options = this.buildEffectiveOptions(config)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedEffectiveConfig(): Promise<PplOptions | null> {
    if (!this._cacheService) {
      return null
    }

    const cached: unknown = await this._cacheService.get({
      key: CACHE_KEYS.CONFIG,
    })

    return isPplOptions(cached) ? cached : null
  }

  private resolveLabelFormat(value: string): PplLabelFormat {
    if (isPplLabelFormat(value)) {
      return value
    }

    this._logger.warn(
      `PPL: Unknown stored label format "${value}", falling back to ${DEFAULT_LABEL_FORMAT}`,
    )
    return DEFAULT_LABEL_FORMAT
  }

  private buildEffectiveOptions(config: UsablePplConfig): PplOptions {
    const options: PplOptions = {
      client_id: config.client_id,
      client_secret: config.client_secret,
      default_label_format: this.resolveLabelFormat(
        config.default_label_format,
      ),
      environment: this._environment,
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
    if (!this._cacheService) {
      return
    }

    await this._cacheService.set({
      data: options,
      key: CACHE_KEYS.CONFIG,
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  /**
   * Invalidate config cache (call after config update)
   */
  async invalidateConfigCache(): Promise<void> {
    // Force client re-init
    this._client = null
    if (this._cacheService) {
      await this._cacheService.clear({ key: CACHE_KEYS.CONFIG })
    }
  }

  // ============================================
  // Lazy Client Initialization
  // ============================================

  private async getClient(): Promise<PplClient> {
    if (this._client) {
      return this._client
    }

    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL is disabled or not configured. Enable it in Settings → PPL.",
      )
    }

    this._client = new PplClient(config)
    return this._client
  }

  /**
   * Reserve a request slot, then resolve the client and the OAuth token to
   * call it with. Every outbound API call goes through here.
   */
  private async getAuthorizedClient(): Promise<AuthorizedClient> {
    const client = await this.getRateLimitedClient()
    const token = await this.getToken(client)

    return { client, token }
  }

  private async getRateLimitedClient(): Promise<PplClient> {
    await this.acquireRateLimitSlot()

    return await this.getClient()
  }

  // ============================================
  // Token Management (Redis prioritized)
  // ============================================

  private async getToken(client: PplClient): Promise<string> {
    const cacheService = this._cacheService

    // Fallback: Local-only mode (Redis unavailable)
    if (!cacheService) {
      return await this.getLocalToken(client)
    }

    // Redis available - use distributed token
    const stored: unknown = await cacheService.get({ key: CACHE_KEYS.TOKEN })

    if (
      isCachedToken(stored) &&
      stored.expiresAt > Date.now() + TOKEN_BUFFER_MS
    ) {
      this._logger.debug("PPL: Using shared OAuth token from Redis")
      return stored.accessToken
    }

    // Need new token - acquire rate limit slot first
    await this.acquireRateLimitSlot()

    const token = await this.fetchToken(client)

    // Store in Redis
    const ttlSeconds = Math.max(
      1,
      Math.floor((token.expiresAt - Date.now()) / MILLISECONDS_PER_SECOND) -
        TOKEN_TTL_SAFETY_SECONDS,
    )
    await cacheService.set({
      data: token satisfies CachedToken,
      key: CACHE_KEYS.TOKEN,
      tags: [CACHE_TAGS.ALL],
      ttl: ttlSeconds,
    })
    this._logger.debug("PPL: Stored OAuth token in Redis")

    return token.accessToken
  }

  private async getLocalToken(client: PplClient): Promise<string> {
    const fallbackToken = this._fallbackToken

    if (
      fallbackToken !== null &&
      fallbackToken.length > 0 &&
      this._fallbackTokenExpiresAt > Date.now() + TOKEN_BUFFER_MS
    ) {
      return fallbackToken
    }

    await this.acquireRateLimitSlot()

    const token = await this.fetchToken(client)
    this._fallbackToken = token.accessToken
    this._fallbackTokenExpiresAt = token.expiresAt

    return token.accessToken
  }

  private async fetchToken(client: PplClient): Promise<CachedToken> {
    try {
      const result = await client.fetchNewToken()
      this._logger.debug("PPL: OAuth token obtained/refreshed")
      return result
    } catch (error) {
      this._logger.error(
        "PPL auth failed",
        error instanceof Error ? error : new Error(String(error)),
      )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `PPL authentication failed: ${getErrorMessage(error)}`,
      )
    }
  }

  // ============================================
  // Rate Limiting (Redis prioritized, atomic)
  // ============================================

  private async acquireRateLimitSlot(): Promise<void> {
    const cacheService = this._cacheService
    const lockingService = this._lockingService

    // Fallback: Local-only mode (Redis/locking unavailable)
    if (!(cacheService && lockingService)) {
      await this.acquireLocalRateLimitSlot()
      return
    }

    // Distributed mode: use locking for atomic check-and-set
    const outcome = await acquireDistributedSlot(cacheService, lockingService)

    if (outcome.status === "failed") {
      throw outcome.error
    }

    if (outcome.status === "timeout") {
      // Lock timeout - fall through to local fallback for this request
      this._logger.warn("PPL: Rate limit lock timed out, using local fallback")
      await this.acquireLocalRateLimitSlot()
      return
    }

    // Sleep outside the lock to minimize lock hold time
    if (outcome.waitTime > 0) {
      await sleep(outcome.waitTime)
    }
  }

  private async acquireLocalRateLimitSlot(): Promise<void> {
    const now = Date.now()
    const elapsed = now - this._fallbackLastRequestTime
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed)
    }
    this._fallbackLastRequestTime = Date.now()
  }

  // ============================================
  // Cache Helpers
  // ============================================

  private async getCached<T extends object>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[],
    isCached: (value: unknown) => value is T,
  ): Promise<T> {
    if (this._cacheService) {
      const cached: unknown = await this._cacheService.get({ key })
      if (isCached(cached)) {
        this._logger.debug(`PPL: Cache hit for ${key}`)
        return cached
      }
    }

    const data = await fetcher()

    if (this._cacheService) {
      await this._cacheService.set({ data, key, tags, ttl })
      this._logger.debug(`PPL: Cached ${key}`)
    }

    return data
  }

  // ============================================
  // Public API: Configuration
  // ============================================

  async getEnvironment(): Promise<PplEnvironment> {
    return await Promise.resolve(this._environment)
  }

  // ============================================
  // Public API: Cache Invalidation
  // ============================================

  async invalidateCodelists(): Promise<void> {
    if (!this._cacheService) {
      return
    }
    await this._cacheService.clear({ tags: [CACHE_TAGS.CODELISTS] })
    this._logger.info("PPL: Invalidated codelist cache")
  }

  async invalidateAllCaches(): Promise<void> {
    if (!this._cacheService) {
      // Clear local fallback
      this._fallbackToken = null
      this._fallbackTokenExpiresAt = 0
      return
    }

    await this._cacheService.clear({ tags: [CACHE_TAGS.ALL] })
    this._logger.info("PPL: Invalidated all caches")
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
    },
  ): Promise<string> {
    const { client, token } = await this.getAuthorizedClient()
    return await client.createShipmentBatch(token, shipments, options)
  }

  async getBatchStatus(batchId: string): Promise<PplBatchResponse> {
    const { client, token } = await this.getAuthorizedClient()
    return await client.getBatchStatus(token, batchId)
  }

  async downloadLabel(labelUrl: string): Promise<Buffer> {
    const { client, token } = await this.getAuthorizedClient()
    return await client.downloadLabel(token, labelUrl)
  }

  async getShipmentInfo(query: PplShipmentQuery): Promise<PplShipmentInfo[]> {
    const { client, token } = await this.getAuthorizedClient()
    return await client.getShipmentInfo(token, query)
  }

  async cancelShipment(shipmentNumber: string): Promise<boolean> {
    const { client, token } = await this.getAuthorizedClient()
    const result = await client.cancelShipment(token, shipmentNumber)
    if (result) {
      this._logger.info(`PPL: Shipment ${shipmentNumber} cancelled`)
    } else {
      this._logger.warn(`PPL: Cancellation failed for ${shipmentNumber}`)
    }
    return result
  }

  // ============================================
  // Public API: Access Points
  // ============================================

  async getAccessPoints(
    query: PplAccessPointsQuery = {},
  ): Promise<PplAccessPoint[]> {
    const { client, token } = await this.getAuthorizedClient()
    return await client.getAccessPoints(token, query)
  }

  // ============================================
  // Public API: Cached Codelists
  // ============================================

  async getCachedCountries(): Promise<PplCodelistCountry[]> {
    return await this.getCached<PplCodelistCountry[]>(
      CACHE_KEYS.COUNTRIES,
      async () => {
        const { client, token } = await this.getAuthorizedClient()
        return await client.getCodelistCountries(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS],
      isCodelistArray,
    )
  }

  async getCachedCurrencies(): Promise<PplCodelistCurrency[]> {
    return await this.getCached<PplCodelistCurrency[]>(
      CACHE_KEYS.CURRENCIES,
      async () => {
        const { client, token } = await this.getAuthorizedClient()
        return await client.getCodelistCurrencies(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS],
      isCodelistArray,
    )
  }

  async getCachedProducts(): Promise<PplCodelistProduct[]> {
    return await this.getCached<PplCodelistProduct[]>(
      CACHE_KEYS.PRODUCTS,
      async () => {
        const { client, token } = await this.getAuthorizedClient()
        return await client.getCodelistProducts(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS],
      isCodelistArray,
    )
  }

  async getCachedServices(): Promise<PplCodelistServiceItem[]> {
    return await this.getCached<PplCodelistServiceItem[]>(
      CACHE_KEYS.SERVICES,
      async () => {
        const { client, token } = await this.getAuthorizedClient()
        return await client.getCodelistServices(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS],
      isCodelistArray,
    )
  }

  async getCachedStatuses(): Promise<PplCodelistStatus[]> {
    return await this.getCached<PplCodelistStatus[]>(
      CACHE_KEYS.STATUSES,
      async () => {
        const { client, token } = await this.getAuthorizedClient()
        return await client.getCodelistStatuses(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS],
      isCodelistArray,
    )
  }

  // ============================================
  // Public API: Customer Data (not cached)
  // ============================================

  async getCustomerInfo(): Promise<PplCustomerInfo | null> {
    const { client, token } = await this.getAuthorizedClient()
    const result = await client.getCustomerInfo(token)
    if (!result) {
      this._logger.warn(
        "PPL: No customer profile configured for these credentials",
      )
    }
    return result
  }

  async getCustomerAddresses(): Promise<PplCustomerAddressResponse | null> {
    const { client, token } = await this.getAuthorizedClient()
    const result = await client.getCustomerAddresses(token)
    if (!result) {
      this._logger.warn("PPL: Customer has no address configured in PPL system")
    }
    return result
  }
}
