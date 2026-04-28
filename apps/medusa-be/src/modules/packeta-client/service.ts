import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import { PacketaClient } from "./client"
import PacketaConfig from "./models/packeta-config"
import {
  PACKETA_SENSITIVE_FIELDS,
  type PacketaBranch,
  type PacketaConfigDTO,
  type PacketaCreatePacketResult,
  type PacketaEnvironment,
  type PacketaLabelFormat,
  type PacketaOptions,
  type PacketaPacketAttributes,
  type PacketaPacketStatusRecord,
  type UpdatePacketaConfigInput,
} from "./types"

const CACHE_KEYS = {
  CONFIG: "packeta:config",
  BRANCHES: "packeta:branches",
} as const

const CACHE_TAGS = {
  ALL: "packeta",
  BRANCHES: "packeta:branches",
} as const

const CACHE_TTL = {
  CONFIG: 60,
  BRANCHES: 24 * 3600,
} as const

type InjectedDependencies = {
  logger: Logger
  [Modules.CACHING]?: ICachingModuleService
}

type PacketaModuleOptions = {
  environment: PacketaEnvironment
}

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
  private client_: PacketaClient | null = null
  protected readonly logger_: Logger
  protected readonly environment_: PacketaEnvironment
  protected readonly cacheService_: ICachingModuleService | null

  constructor(container: InjectedDependencies, options: PacketaModuleOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.environment_ = options.environment

    this.cacheService_ = this.safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )

    if (!this.cacheService_) {
      this.logger_.warn(
        "Packeta: Cache service not available. Using local-only mode (not suitable for multi-container)."
      )
    }

    this.logger_.info(
      `Packeta: Module service initialized (${this.environment_} environment)`
    )
  }

  private safeResolve<T>(
    container: InjectedDependencies,
    key: string
  ): T | null {
    try {
      return ((container as Record<string, unknown>)[key] as T) ?? null
    } catch {
      return null
    }
  }

  getEnvironment(): PacketaEnvironment {
    return this.environment_
  }

  // ============================================
  // Config Management (DB-stored, encrypted)
  // ============================================

  async getConfig(): Promise<PacketaConfigDTO | null> {
    const configs = await this.listPacketaConfigs(
      { environment: this.environment_ },
      { take: 1 }
    )
    const config = configs[0]
    if (!config) {
      return null
    }
    return decryptFields(config as unknown as PacketaConfigDTO, [
      ...PACKETA_SENSITIVE_FIELDS,
    ])
  }

  /**
   * Update config.
   * Empty string on a sensitive field = keep existing value.
   * null on a sensitive field = clear it.
   */
  async updateConfig(
    data: UpdatePacketaConfigInput
  ): Promise<PacketaConfigDTO> {
    const existing = await this.getConfig()

    const filteredData = { ...data }
    for (const field of PACKETA_SENSITIVE_FIELDS) {
      const key = field as keyof UpdatePacketaConfigInput
      if (filteredData[key] === "") {
        delete filteredData[key]
      }
    }

    const encrypted = encryptFields(filteredData, [...PACKETA_SENSITIVE_FIELDS])

    if (existing) {
      const updated = await this.updatePacketaConfigs({
        id: existing.id,
        ...encrypted,
      })
      await this.invalidateConfigCache()
      return decryptFields(updated as unknown as PacketaConfigDTO, [
        ...PACKETA_SENSITIVE_FIELDS,
      ])
    }

    const created = await this.createPacketaConfigs({
      ...encrypted,
      environment: this.environment_,
    })
    await this.invalidateConfigCache()
    return decryptFields(created as unknown as PacketaConfigDTO, [
      ...PACKETA_SENSITIVE_FIELDS,
    ])
  }

  /**
   * Effective config used by API calls. Cached briefly so multiple requests in
   * the same burst don't re-hit the DB. Returns null if disabled / unconfigured.
   */
  async getEffectiveConfig(): Promise<PacketaOptions | null> {
    if (this.cacheService_) {
      const cached = await this.cacheService_.get({ key: CACHE_KEYS.CONFIG })
      if (cached) {
        return cached as PacketaOptions
      }
    }

    const config = await this.getConfig()
    if (!config?.is_enabled) {
      return null
    }
    if (!config.api_password) {
      return null
    }

    const options: PacketaOptions = {
      api_password: config.api_password,
      environment: this.environment_,
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

    if (this.cacheService_) {
      await this.cacheService_.set({
        key: CACHE_KEYS.CONFIG,
        data: options,
        ttl: CACHE_TTL.CONFIG,
        tags: [CACHE_TAGS.ALL],
      })
    }

    return options
  }

  async invalidateConfigCache(): Promise<void> {
    this.client_ = null
    if (this.cacheService_) {
      await this.cacheService_.clear({ key: CACHE_KEYS.CONFIG })
    }
  }

  async invalidateAllCaches(): Promise<void> {
    this.client_ = null
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

  private async getClient(): Promise<PacketaClient> {
    if (this.client_) {
      return this.client_
    }

    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta is disabled or not configured. Enable it in Settings → Packeta."
      )
    }

    this.client_ = new PacketaClient(config)
    return this.client_
  }

  // ============================================
  // Public API
  // ============================================

  async createPacket(
    attributes: PacketaPacketAttributes
  ): Promise<PacketaCreatePacketResult> {
    const client = await this.getClient()
    return client.createPacket(attributes)
  }

  async cancelPacket(packetId: number): Promise<boolean> {
    const client = await this.getClient()
    const result = await client.cancelPacket(packetId)
    if (result) {
      this.logger_.info(`Packeta: Packet ${packetId} cancelled`)
    } else {
      this.logger_.warn(`Packeta: Cancellation failed for packet ${packetId}`)
    }
    return result
  }

  async getPacketStatus(
    packetId: number
  ): Promise<PacketaPacketStatusRecord[]> {
    const client = await this.getClient()
    return client.packetStatus(packetId)
  }

  async downloadLabelPdf(
    packetId: number,
    format?: PacketaLabelFormat,
    offset?: number
  ): Promise<Buffer> {
    const client = await this.getClient()
    return client.downloadLabelPdf(packetId, format, offset)
  }

  /**
   * Pickup-point (branch) list. Cached for 24h — safe to call on hot paths.
   */
  async getBranches(): Promise<PacketaBranch[]> {
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: CACHE_KEYS.BRANCHES,
      })) as PacketaBranch[] | null
      if (cached) {
        return cached
      }
    }

    const client = await this.getClient()
    const branches = await client.getBranchList()

    if (this.cacheService_ && branches.length > 0) {
      await this.cacheService_.set({
        key: CACHE_KEYS.BRANCHES,
        data: branches,
        ttl: CACHE_TTL.BRANCHES,
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
      })
    }

    return branches
  }
}
