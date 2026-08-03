import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
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

type DisabledConfigCacheEntry = {
  disabled: true
}

type CachedConfigEntry = PacketaOptions | DisabledConfigCacheEntry

const isDisabledConfigCacheEntry = (
  value: unknown
): value is DisabledConfigCacheEntry =>
  isRecord(value) && value["disabled"] === true

const isPacketaEnvironment = (value: unknown): value is PacketaEnvironment =>
  value === "testing" || value === "production"

const toPacketaConfigDTO = (value: unknown): PacketaConfigDTO => {
  if (
    !isRecord(value) ||
    typeof value["id"] !== "string" ||
    !isPacketaEnvironment(value["environment"]) ||
    typeof value["is_enabled"] !== "boolean" ||
    (value["api_password"] !== null &&
      typeof value["api_password"] !== "string") ||
    (value["sender_label"] !== null &&
      typeof value["sender_label"] !== "string") ||
    (value["eshop_id"] !== null && typeof value["eshop_id"] !== "string") ||
    typeof value["default_label_format"] !== "string" ||
    typeof value["default_label_offset"] !== "number" ||
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
      "Packeta: Stored configuration has an invalid shape"
    )
  }

  return {
    id: value["id"],
    environment: value["environment"],
    is_enabled: value["is_enabled"],
    api_password: value["api_password"],
    sender_label: value["sender_label"],
    eshop_id: value["eshop_id"],
    default_label_format: value["default_label_format"],
    default_label_offset: value["default_label_offset"],
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

    this.cacheService_ = safeResolve<ICachingModuleService>(
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

  async getEnvironment(): Promise<PacketaEnvironment> {
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
    return decryptFields(toPacketaConfigDTO(config), [
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
      return decryptFields(toPacketaConfigDTO(updated), [
        ...PACKETA_SENSITIVE_FIELDS,
      ])
    }

    const created = await this.createPacketaConfigs({
      ...encrypted,
      environment: this.environment_,
    })
    await this.invalidateConfigCache()
    return decryptFields(toPacketaConfigDTO(created), [
      ...PACKETA_SENSITIVE_FIELDS,
    ])
  }

  /**
   * Effective config used by API calls. Cached briefly so multiple requests in
   * the same burst don't re-hit the DB. Returns null if disabled / unconfigured.
   */
  async getEffectiveConfig(): Promise<PacketaOptions | null> {
    const cached = await this.getCachedConfig()
    if (cached !== undefined) {
      return cached
    }

    const config = await this.getConfig()
    const apiPassword = config?.api_password
    if (!(config?.is_enabled && apiPassword)) {
      await this.cacheDisabledConfig()
      return null
    }

    const options = this.toEffectiveOptions(config, apiPassword)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedConfig(): Promise<PacketaOptions | null | undefined> {
    if (!this.cacheService_) {
      return
    }
    const cached = (await this.cacheService_.get({
      key: CACHE_KEYS.CONFIG,
    })) as CachedConfigEntry | null
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    return cached ?? undefined
  }

  private toEffectiveOptions(
    config: PacketaConfigDTO,
    apiPassword: string
  ): PacketaOptions {
    const options: PacketaOptions = {
      api_password: apiPassword,
      environment: this.environment_,
      default_label_format: config.default_label_format as PacketaLabelFormat,
      default_label_offset: config.default_label_offset,
    }
    const optionalFields = [
      "sender_label",
      "eshop_id",
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

  private async cacheEffectiveConfig(options: PacketaOptions): Promise<void> {
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

  private async cacheDisabledConfig(): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: CACHE_KEYS.CONFIG,
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
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
