import type {
  ICachingModuleService,
  ILockingModule,
  Logger,
} from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { PacketaClient } from "./client"
import PacketaConfig from "./models/packeta-config"
import {
  PACKETA_SENSITIVE_FIELDS,
  type PacketaBranch,
  type PacketaConfigDTO,
  type PacketaConfigReference,
  type PacketaCreatePacketResult,
  type PacketaEnvironment,
  type PacketaLabelFormat,
  type PacketaOptions,
  type PacketaPacketAttributes,
  type PacketaPacketStatusRecord,
  type UpdatePacketaConfigInput,
} from "./types"

const CACHE_TAGS = {
  ALL: "packeta",
  BRANCHES: "packeta:branches",
} as const

const CACHE_TTL = {
  CONFIG: 60,
  BRANCHES: 24 * 3600,
} as const

const getConfigCacheKey = (configId: string) => ["packeta", "config", configId].join(":")
const getBranchesCacheKey = (configId: string) => ["packeta", "branches", configId].join(":")

type InjectedDependencies = {
  logger: Logger
  [Modules.LOCKING]: ILockingModule
  [Modules.CACHING]?: ICachingModuleService
}

type DisabledConfigCacheEntry = {
  disabled: true
}

type CachedConfigEntry = PacketaOptions | DisabledConfigCacheEntry

const isDisabledConfigCacheEntry = (
  value: unknown
): value is DisabledConfigCacheEntry =>
  typeof value === "object" &&
  value !== null &&
  "disabled" in value &&
  (value as { disabled?: unknown }).disabled === true

/**
 * Packeta Client Module Service
 *
 * Manages the Packeta REST API client lifecycle:
 * - DB-stored configuration with encrypted credentials
 * - Short-TTL config cache (Redis) so admin edits propagate quickly
 * - Long-TTL branch (pickup-point) feed cache (Redis)
 * - Lazy HTTP client init, recreated when config changes
 *
 * Registered only when FEATURE_PACKETA_ENABLED=1.
 */
export class PacketaClientModuleService extends MedusaService({
  PacketaConfig,
}) {
  protected readonly container_: InjectedDependencies
  protected readonly logger_: Logger
  protected readonly lockingService_: ILockingModule
  protected readonly cacheService_: ICachingModuleService | null

  constructor(container: InjectedDependencies, options: Record<string, never> = {}) {
    super(container, options)
    this.container_ = container
    this.logger_ = container.logger
    this.lockingService_ = container[Modules.LOCKING]

    this.cacheService_ = safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )

    if (!this.cacheService_) {
      this.logger_.warn(
        "Packeta: Cache service not available. Using local-only mode (not suitable for multi-container)."
      )
    }

    this.logger_.info("Packeta: Module service initialized with Admin-managed profiles")
  }

  async getEnvironment(): Promise<PacketaEnvironment> {
    const config = await this.getActiveConfig()
    return config.environment
  }

  // ============================================
  // Config Management (DB-stored, encrypted)
  // ============================================

  async listConfigProfiles(): Promise<PacketaConfigDTO[]> {
    const configs = await this.listPacketaConfigs({}, { order: { environment: "ASC" } })
    return configs.map((config) => this.decryptConfig(config as unknown as PacketaConfigDTO))
  }

  async getConfig(environment?: PacketaEnvironment): Promise<PacketaConfigDTO | null> {
    if (!environment) {
      return this.getActiveConfig()
    }

    const configs = await this.listPacketaConfigs(
      { environment },
      { take: 1 }
    )
    const config = configs[0]
    if (!config) {
      return null
    }
    return this.decryptConfig(config as unknown as PacketaConfigDTO)
  }

  async getActiveConfig(): Promise<PacketaConfigDTO> {
    const configs = await this.listPacketaConfigs({ is_active: true }, { take: 2 })
    if (configs.length !== 1) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Packeta must have exactly one active configuration profile"
      )
    }
    return this.decryptConfig(configs[0] as unknown as PacketaConfigDTO)
  }

  private decryptConfig(config: PacketaConfigDTO): PacketaConfigDTO {
    return decryptFields(config, [...PACKETA_SENSITIVE_FIELDS])
  }

  /**
   * Update config.
   * Empty string on a sensitive field = keep existing value.
   * null on a sensitive field = clear it.
   */
  async updateConfig(
    environment: PacketaEnvironment,
    data: UpdatePacketaConfigInput
  ): Promise<PacketaConfigDTO> {
    const existing = await this.getConfig(environment)

    const filteredData = { ...data }
    for (const field of PACKETA_SENSITIVE_FIELDS) {
      const key = field as keyof UpdatePacketaConfigInput
      if (filteredData[key] === "") {
        delete filteredData[key]
      }
    }

    if (filteredData.widget_countries) {
      filteredData.widget_countries = Array.from(new Set(filteredData.widget_countries))
    }

    const isEnabled = filteredData.is_enabled ?? existing?.is_enabled ?? false
    const apiPassword = filteredData.api_password === undefined ? existing?.api_password : filteredData.api_password
    const widgetApiKey = filteredData.widget_api_key === undefined ? existing?.widget_api_key : filteredData.widget_api_key
    const widgetCountries = filteredData.widget_countries ?? existing?.widget_countries ?? []
    if (isEnabled && (!apiPassword || !widgetApiKey || widgetCountries.length === 0)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Packeta requires an API password, Widget API key, and at least one widget market before it can be enabled")
    }

    const encrypted = encryptFields(filteredData, [...PACKETA_SENSITIVE_FIELDS])

    if (existing) {
      const updated = await this.updatePacketaConfigs({
        id: existing.id,
        ...encrypted,
      })
      await this.invalidateAllCaches()
      return this.decryptConfig(updated as unknown as PacketaConfigDTO)
    }

    const created = await this.createPacketaConfigs({
      ...encrypted,
      environment,
    })
    await this.invalidateAllCaches()
    return this.decryptConfig(created as unknown as PacketaConfigDTO)
  }

  async activateConfig(environment: PacketaEnvironment, confirmed: boolean): Promise<PacketaConfigDTO> {
    return this.lockingService_.execute("packeta:activate-config", async () => {
      const profiles = await this.listConfigProfiles()
      const target = profiles.find((profile) => profile.environment === environment)
      if (!target) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `Packeta ${environment} profile was not found`)
      }

      if (environment === "production") {
        if (!confirmed) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Activating the Packeta production profile requires explicit confirmation")
        }
        if (!target.is_enabled || !target.api_password || !target.widget_api_key || target.widget_countries.length === 0) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enable the Packeta production profile and complete its API and storefront widget settings before activating it")
        }
      }

      const inactiveUpdates = profiles
        .filter((profile) => profile.id !== target.id && profile.is_active)
        .map((profile) => ({ id: profile.id, is_active: false }))
      const updates = [...inactiveUpdates, { id: target.id, is_active: true }]
      const updatedProfiles = await this.updatePacketaConfigs(updates)
      await this.invalidateAllCaches()

      const updatedTarget = updatedProfiles.find((profile) => profile.id === target.id)
      if (!updatedTarget) {
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "Packeta active profile was not persisted")
      }
      return this.decryptConfig(updatedTarget as unknown as PacketaConfigDTO)
    })
  }

  /**
   * Effective config used by API calls. Cached briefly so multiple requests in
   * the same burst don't re-hit the DB. Returns null if disabled / unconfigured.
   */
  async getEffectiveConfig(reference: PacketaConfigReference = {}): Promise<PacketaOptions | null> {
    const config = await this.resolveConfig(reference)
    if (!config) {
      return null
    }

    const cached = await this.getCachedConfig(config.id)
    if (cached !== undefined) {
      return cached
    }

    const apiPassword = config.api_password
    if (!config.is_enabled || !apiPassword) {
      await this.cacheDisabledConfig(config.id)
      return null
    }

    const options = await this.toEffectiveOptions(config, apiPassword)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async resolveConfig(reference: PacketaConfigReference): Promise<PacketaConfigDTO | null> {
    if (reference.config_id) {
      const configs = await this.listPacketaConfigs({ id: reference.config_id }, { take: 1 })
      const config = configs[0]
      if (!config) {
        return null
      }

      const decrypted = this.decryptConfig(config as unknown as PacketaConfigDTO)
      if (reference.environment && reference.environment !== decrypted.environment) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "Packeta configuration reference does not match its profile")
      }
      return decrypted
    }

    return this.getConfig(reference.environment ?? undefined)
  }

  private async getCachedConfig(configId: string): Promise<PacketaOptions | null | undefined> {
    if (!this.cacheService_) {
      return
    }
    const cached = (await this.cacheService_.get({
      key: getConfigCacheKey(configId),
    })) as CachedConfigEntry | null
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    return cached ?? undefined
  }

  private async toEffectiveOptions(
    config: PacketaConfigDTO,
    apiPassword: string
  ): Promise<PacketaOptions> {
    return {
      config_id: config.id,
      api_password: apiPassword,
      pickup_points_api_key: config.widget_api_key ?? undefined,
      environment: config.environment,
      allow_live_operations: config.allow_live_operations,
      default_label_format: config.default_label_format as PacketaLabelFormat,
      default_label_offset: config.default_label_offset,
      sender_label: config.sender_label ?? undefined,
      eshop_id: config.eshop_id ?? undefined,
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

  private async cacheEffectiveConfig(options: PacketaOptions): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: getConfigCacheKey(options.config_id),
      data: options,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  private async cacheDisabledConfig(configId: string): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: getConfigCacheKey(configId),
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  async invalidateAllCaches(): Promise<void> {
    if (this.cacheService_) {
      await this.cacheService_.clear({ tags: [CACHE_TAGS.ALL] })
      this.logger_.info("Packeta: Invalidated all caches")
    }
  }

  async invalidateBranchCache(): Promise<void> {
    if (this.cacheService_) {
      await this.cacheService_.clear({ tags: [CACHE_TAGS.BRANCHES] })
    }
  }

  // ============================================
  // Lazy Client
  // ============================================

  private async getClient(reference: PacketaConfigReference = {}, requireWriteAccess = false): Promise<PacketaClient> {
    const config = await this.getEffectiveConfig(reference)
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta is disabled or not configured. Enable it in Settings → Packeta."
      )
    }

    if (requireWriteAccess && config.environment === "testing" && !config.allow_live_operations) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta carrier writes are locked for the Testing profile. Explicitly allow live operations in Settings → Packeta before continuing."
      )
    }

    return new PacketaClient(config)
  }

  // ============================================
  // Public API
  // ============================================

  async createPacket(
    attributes: PacketaPacketAttributes,
    reference: PacketaConfigReference = {}
  ): Promise<PacketaCreatePacketResult> {
    const client = await this.getClient(reference, true)
    return client.createPacket(attributes)
  }

  async cancelPacket(packetId: number, reference: PacketaConfigReference = {}): Promise<boolean> {
    const client = await this.getClient(reference, true)
    const result = await client.cancelPacket(packetId)
    if (result) {
      this.logger_.info(`Packeta: Packet ${packetId} cancelled`)
    } else {
      this.logger_.warn(`Packeta: Cancellation failed for packet ${packetId}`)
    }
    return result
  }

  async getPacketStatus(
    packetId: number,
    reference: PacketaConfigReference = {}
  ): Promise<PacketaPacketStatusRecord[]> {
    const client = await this.getClient(reference)
    return client.packetStatus(packetId)
  }

  async downloadLabelPdf(
    packetId: number,
    format?: PacketaLabelFormat,
    offset?: number,
    reference: PacketaConfigReference = {}
  ): Promise<Buffer> {
    const client = await this.getClient(reference)
    return client.downloadLabelPdf(packetId, format, offset)
  }

  /**
   * Pickup-point (branch) list. Cached for 24h — safe to call on hot paths.
   */
  async getBranches(): Promise<PacketaBranch[]> {
    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta is disabled or not configured. Enable it in Settings → Packeta."
      )
    }
    const cacheKey = getBranchesCacheKey(config.config_id)

    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: cacheKey,
      })) as PacketaBranch[] | null
      if (cached) {
        return cached
      }
    }

    const client = await this.getClient({ config_id: config.config_id, environment: config.environment })
    const branches = await client.getBranchList()

    if (this.cacheService_ && branches.length > 0) {
      await this.cacheService_.set({
        key: cacheKey,
        data: branches,
        ttl: CACHE_TTL.BRANCHES,
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
      })
    }

    return branches
  }
}
