import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type {
  Context,
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import {
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
  Modules,
} from "@medusajs/framework/utils"
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
  type PplConfigReference,
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

const CACHE_KEYS = {
  RATE_LIMIT: "ppl:rate:last_request",
  COUNTRIES: "ppl:codelist:countries",
  CURRENCIES: "ppl:codelist:currencies",
  PRODUCTS: "ppl:codelist:products",
  SERVICES: "ppl:codelist:services",
  STATUSES: "ppl:codelist:statuses",
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

export class PplClientModuleService extends MedusaService({ PplConfig }) {
  private readonly logger_: Logger
  private readonly cacheService_: ICachingModuleService | null
  private readonly lockingService_: ILockingModule | null

  private readonly fallbackTokens_ = new Map<string, CachedToken>()
  private fallbackLastRequestTime_ = 0

  constructor(
    container: InjectedDependencies,
    options: Record<string, unknown> = {}
  ) {
    super(container, options)

    this.logger_ = container.logger
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
      "PPL: Module service initialized with Admin-managed profiles"
    )
  }

  async listConfigProfiles(): Promise<PplConfigDTO[]> {
    const configs = await this.listPplConfigs(
      {},
      { order: { environment: "ASC" } }
    )
    return configs.map((config) => this.decryptConfig(config))
  }

  async getConfig(environment?: PplEnvironment): Promise<PplConfigDTO | null> {
    if (!environment) {
      return this.getActiveConfig()
    }

    const configs = await this.listPplConfigs({ environment }, { take: 1 })
    const config = configs[0]
    if (!config) {
      return null
    }
    return this.decryptConfig(config)
  }

  async getActiveConfig(): Promise<PplConfigDTO> {
    const configs = await this.listPplConfigs({ is_active: true }, { take: 2 })
    if (configs.length !== 1) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "PPL must have exactly one active configuration profile"
      )
    }
    return this.decryptConfig(configs[0])
  }

  private decryptConfig(config: unknown): PplConfigDTO {
    return decryptFields(config as PplConfigDTO, [...PPL_SENSITIVE_FIELDS])
  }

  async updateConfig(
    environmentOrData: PplEnvironment | UpdatePplConfigInput,
    profileData?: UpdatePplConfigInput
  ): Promise<PplConfigDTO> {
    const existingActive =
      typeof environmentOrData === "string" ? null : await this.getConfig()
    const environment =
      typeof environmentOrData === "string"
        ? environmentOrData
        : (existingActive?.environment ?? "testing")
    const data =
      typeof environmentOrData === "string"
        ? (profileData ?? {})
        : environmentOrData
    const existing = await this.getConfig(environment)

    const filteredData = { ...data }
    for (const field of PPL_SENSITIVE_FIELDS) {
      const key = field as keyof UpdatePplConfigInput
      if (filteredData[key] === "") {
        delete filteredData[key]
      }
    }

    const encrypted = encryptFields(filteredData, [...PPL_SENSITIVE_FIELDS])

    if (existing) {
      const updated = await this.updatePplConfigs({
        id: existing.id,
        ...encrypted,
      })
      await this.invalidateAllCaches()
      return this.decryptConfig(updated)
    }

    const created = await this.createPplConfigs({
      ...encrypted,
      environment,
    })
    await this.invalidateAllCaches()
    return this.decryptConfig(created)
  }

  async activateConfig(
    environment: PplEnvironment,
    confirmed: boolean
  ): Promise<PplConfigDTO> {
    const lockingService = this.lockingService_
    if (!lockingService) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "PPL configuration requires the locking module"
      )
    }

    return lockingService.execute("ppl:activate-config", async () => {
      const profiles = await this.listConfigProfiles()
      const target = profiles.find(
        (profile) => profile.environment === environment
      )
      if (!target) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `PPL ${environment} profile was not found`
        )
      }

      if (environment === "production") {
        if (!confirmed) {
          throw new MedusaError(
            MedusaError.Types.NOT_ALLOWED,
            "Activating the PPL production profile requires explicit confirmation"
          )
        }
        if (!this.isConfigUsable(target)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Enable the PPL production profile and complete its API credentials before activating it"
          )
        }
      }

      const inactiveUpdates = profiles
        .filter((profile) => profile.id !== target.id && profile.is_active)
        .map((profile) => ({ id: profile.id, is_active: false }))
      const updatedTarget = await this.switchActiveConfig(
        inactiveUpdates,
        target.id
      )
      await this.invalidateAllCaches()

      return this.decryptConfig(updatedTarget)
    })
  }

  @InjectTransactionManager()
  protected async switchActiveConfig(
    inactiveUpdates: Array<{ id: string; is_active: boolean }>,
    targetId: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<unknown> {
    if (inactiveUpdates.length > 0) {
      await this.updatePplConfigs(inactiveUpdates, sharedContext)
      const transactionManager = sharedContext.transactionManager
      if (!transactionManager) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "PPL configuration transaction manager is unavailable"
        )
      }
      await transactionManager.flush()
    }

    return this.updatePplConfigs(
      { id: targetId, is_active: true },
      sharedContext
    )
  }

  async getEffectiveConfig(
    reference: PplConfigReference = {}
  ): Promise<PplOptions | null> {
    const config = await this.resolveConfig(reference)
    if (!this.isConfigUsable(config)) {
      return null
    }

    return this.buildEffectiveOptions(config)
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
      config_id: config.id,
      client_id: config.client_id,
      client_secret: config.client_secret,
      environment: config.environment,
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

  private async resolveConfig(
    reference: PplConfigReference
  ): Promise<PplConfigDTO | null> {
    if (reference.config_id) {
      const configs = await this.listPplConfigs(
        { id: reference.config_id },
        { take: 1 }
      )
      const config = configs[0]
      if (!config) {
        return null
      }
      const decrypted = this.decryptConfig(config)
      if (
        reference.environment &&
        reference.environment !== decrypted.environment
      ) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "PPL configuration reference does not match its profile"
        )
      }
      return decrypted
    }

    return this.getConfig(reference.environment)
  }

  async invalidateConfigCache(): Promise<void> {
    await this.invalidateAllCaches()
  }

  private async getClient(
    reference: PplConfigReference = {}
  ): Promise<{ client: PplClient; config: PplOptions }> {
    const config = await this.getEffectiveConfig(reference)
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "PPL is disabled or not configured. Enable it in Settings → PPL."
      )
    }

    return { client: new PplClient(config), config }
  }

  private async getToken(client: PplClient, configId: string): Promise<string> {
    const tokenCacheKey = `ppl:oauth:token:${configId}`
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: tokenCacheKey,
      })) as CachedToken | null

      if (cached && cached.expiresAt > Date.now() + TOKEN_BUFFER_MS) {
        this.logger_.debug("PPL: Using shared OAuth token from Redis")
        return cached.accessToken
      }

      await this.acquireRateLimitSlot()

      const { accessToken, expiresAt } =
        await this.fetchTokenWithErrorHandling(client)

      const ttlSeconds = Math.max(
        1,
        Math.floor((expiresAt - Date.now()) / 1000) - 60
      )
      await this.cacheService_.set({
        key: tokenCacheKey,
        data: { accessToken, expiresAt } satisfies CachedToken,
        ttl: ttlSeconds,
        tags: [CACHE_TAGS.ALL],
      })
      this.logger_.debug("PPL: Stored OAuth token in Redis")

      return accessToken
    }

    const fallbackToken = this.fallbackTokens_.get(configId)
    if (
      fallbackToken &&
      fallbackToken.expiresAt > Date.now() + TOKEN_BUFFER_MS
    ) {
      return fallbackToken.accessToken
    }

    await this.acquireRateLimitSlot()

    const tokenResult = await this.fetchTokenWithErrorHandling(client)
    this.fallbackTokens_.set(configId, tokenResult)

    return tokenResult.accessToken
  }

  private async fetchTokenWithErrorHandling(client: PplClient): Promise<{
    accessToken: string
    expiresAt: number
  }> {
    try {
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

  async getEnvironment(): Promise<PplEnvironment> {
    const config = await this.getActiveConfig()
    return config.environment
  }

  async invalidateCodelists(): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.clear({ tags: [CACHE_TAGS.CODELISTS] })
    this.logger_.info("PPL: Invalidated codelist cache")
  }

  async invalidateAllCaches(): Promise<void> {
    this.fallbackTokens_.clear()

    if (!this.cacheService_) {
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
    },
    reference: PplConfigReference = {}
  ): Promise<string> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    return client.createShipmentBatch(token, shipments, options)
  }

  async getBatchStatus(
    batchId: string,
    reference: PplConfigReference = {}
  ): Promise<PplBatchResponse> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    return client.getBatchStatus(token, batchId)
  }

  async downloadLabel(
    labelUrl: string,
    reference: PplConfigReference = {}
  ): Promise<Buffer> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    return client.downloadLabel(token, labelUrl)
  }

  async getShipmentInfo(
    query: PplShipmentQuery,
    reference: PplConfigReference = {}
  ): Promise<PplShipmentInfo[]> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    return client.getShipmentInfo(token, query)
  }

  async cancelShipment(
    shipmentNumber: string,
    reference: PplConfigReference = {}
  ): Promise<boolean> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
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
    const { client, config } = await this.getClient()
    const token = await this.getToken(client, config.config_id)
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
        const { client, config } = await this.getClient()
        const token = await this.getToken(client, config.config_id)
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
        const { client, config } = await this.getClient()
        const token = await this.getToken(client, config.config_id)
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
        const { client, config } = await this.getClient()
        const token = await this.getToken(client, config.config_id)
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
        const { client, config } = await this.getClient()
        const token = await this.getToken(client, config.config_id)
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
        const { client, config } = await this.getClient()
        const token = await this.getToken(client, config.config_id)
        return client.getCodelistStatuses(token)
      },
      CACHE_TTL.CODELISTS,
      [CACHE_TAGS.ALL, CACHE_TAGS.CODELISTS]
    )
  }

  // ============================================
  // Public API: Customer Data (not cached)
  // ============================================

  async getCustomerInfo(
    reference: PplConfigReference = {}
  ): Promise<PplCustomerInfo | null> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    const result = await client.getCustomerInfo(token)
    if (!result) {
      this.logger_.warn(
        "PPL: No customer profile configured for these credentials"
      )
    }
    return result
  }

  async getCustomerAddresses(
    reference: PplConfigReference = {}
  ): Promise<PplCustomerAddressResponse | null> {
    await this.acquireRateLimitSlot()
    const { client, config } = await this.getClient(reference)
    const token = await this.getToken(client, config.config_id)
    const result = await client.getCustomerAddresses(token)
    if (!result) {
      this.logger_.warn("PPL: Customer has no address configured in PPL system")
    }
    return result
  }
}
