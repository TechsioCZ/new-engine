import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { GLSClient } from "./client"
import GLSConfig from "./models/gls-config"
import {
  GLS_SENSITIVE_FIELDS,
  type GLSBranch,
  type GLSConfigDTO,
  type GLSCreatePacketResult,
  type GLSEnvironment,
  type GLSLabelFormat,
  type GLSOptions,
  type GLSPacketAttributes,
  type GLSPacketStatusRecord,
  type UpdateGLSConfigInput,
} from "./types"

const computeKey = (scope: string, parts: Record<string, unknown> = {}) =>
  [
    "gls",
    scope,
    ...Object.entries(parts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}:${String(value)}`),
  ].join(":")

const CACHE_TAGS = {
  ALL: "gls",
  BRANCHES: "gls:branches",
} as const

const CACHE_TTL = {
  CONFIG: 60,
  BRANCHES: 24 * 3600,
} as const

type InjectedDependencies = {
  logger: Logger
  [Modules.CACHING]?: ICachingModuleService
}

type GLSModuleOptions = {
  environment: GLSEnvironment
}

type DisabledConfigCacheEntry = {
  disabled: true
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isDisabledConfigCacheEntry = (
  value: unknown
): value is DisabledConfigCacheEntry =>
  isRecord(value) && value.disabled === true

const isGLSLabelFormat = (value: unknown): value is GLSLabelFormat =>
  value === "A6" || value === "A7"

const isGLSEnvironment = (value: unknown): value is GLSEnvironment =>
  value === "testing" || value === "production"

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string"

const isGLSOptions = (value: unknown): value is GLSOptions =>
  isRecord(value) &&
  typeof value.api_password === "string" &&
  isGLSEnvironment(value.environment) &&
  isGLSLabelFormat(value.default_label_format) &&
  typeof value.default_label_offset === "number" &&
  isOptionalString(value.sender_label) &&
  isOptionalString(value.eshop_id) &&
  isOptionalString(value.cod_bank_account) &&
  isOptionalString(value.cod_bank_code) &&
  isOptionalString(value.cod_iban) &&
  isOptionalString(value.cod_swift) &&
  isOptionalString(value.sender_name) &&
  isOptionalString(value.sender_street) &&
  isOptionalString(value.sender_city) &&
  isOptionalString(value.sender_zip_code) &&
  isOptionalString(value.sender_country) &&
  isOptionalString(value.sender_phone) &&
  isOptionalString(value.sender_email)

const nullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const toDate = (value: unknown): Date =>
  value instanceof Date ? value : new Date(String(value ?? Date.now()))

const mapGLSConfigDTO = (config: unknown): GLSConfigDTO => {
  if (!isRecord(config)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record"
    )
  }

  const id: unknown = config.id
  const environment: unknown = config.environment
  const isEnabled: unknown = config.is_enabled
  const defaultLabelFormat: unknown = config.default_label_format
  const defaultLabelOffset: unknown = config.default_label_offset

  if (
    typeof id !== "string" ||
    !isGLSEnvironment(environment) ||
    typeof isEnabled !== "boolean" ||
    typeof defaultLabelFormat !== "string" ||
    typeof defaultLabelOffset !== "number"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record"
    )
  }

  return {
    id,
    environment,
    is_enabled: isEnabled,
    api_password: nullableString(config.api_password),
    sender_label: nullableString(config.sender_label),
    eshop_id: nullableString(config.eshop_id),
    default_label_format: defaultLabelFormat,
    default_label_offset: defaultLabelOffset,
    cod_bank_account: nullableString(config.cod_bank_account),
    cod_bank_code: nullableString(config.cod_bank_code),
    cod_iban: nullableString(config.cod_iban),
    cod_swift: nullableString(config.cod_swift),
    sender_name: nullableString(config.sender_name),
    sender_street: nullableString(config.sender_street),
    sender_city: nullableString(config.sender_city),
    sender_zip_code: nullableString(config.sender_zip_code),
    sender_country: nullableString(config.sender_country),
    sender_phone: nullableString(config.sender_phone),
    sender_email: nullableString(config.sender_email),
    created_at: toDate(config.created_at),
    updated_at: toDate(config.updated_at),
  }
}

/**
 * GLS Client Module Service
 *
 * Manages the GLS REST API client lifecycle:
 * - DB-stored configuration with encrypted credentials
 * - Short-TTL config cache (Redis) so admin edits propagate quickly
 * - Long-TTL branch (pickup-point) feed cache (Redis)
 * - Lazy HTTP client init, recreated when config changes
 *
 * Registered only when FEATURE_GLS_ENABLED=1.
 */
export class GLSClientModuleService extends MedusaService({
  GLSConfig,
}) {
  private client_: GLSClient | null = null
  private clientConfigFingerprint_: string | null = null
  private branchesRefresh_: Promise<GLSBranch[]> | null = null
  protected readonly logger_: Logger
  protected readonly environment_: GLSEnvironment
  protected readonly cacheService_: ICachingModuleService | null

  constructor(container: InjectedDependencies, options: GLSModuleOptions) {
    super(container, options)
    this.logger_ = container.logger
    this.environment_ = options.environment

    this.cacheService_ = safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )

    if (!this.cacheService_) {
      this.logger_.warn(
        "GLS: Cache service not available. Using local-only mode (not suitable for multi-container)."
      )
    }

    this.logger_.info(
      `GLS: Module service initialized (${this.environment_} environment)`
    )
  }

  async getEnvironment(): Promise<GLSEnvironment> {
    return this.environment_
  }

  // ============================================
  // Config Management (DB-stored, encrypted)
  // ============================================

  async getConfig(): Promise<GLSConfigDTO | null> {
    const configs = await this.listGLSConfigs(
      { environment: this.environment_ },
      { take: 1 }
    )
    const config = configs[0]
    if (!config) {
      return null
    }
    return decryptFields(mapGLSConfigDTO(config), [...GLS_SENSITIVE_FIELDS])
  }

  /**
   * Update config.
   * Empty string on a sensitive field = keep existing value.
   * null on a sensitive field = clear it.
   */
  async updateConfig(data: UpdateGLSConfigInput): Promise<GLSConfigDTO> {
    const existing = await this.getConfig()

    const filteredData = { ...data }
    for (const field of GLS_SENSITIVE_FIELDS) {
      const key = field as keyof UpdateGLSConfigInput
      if (filteredData[key] === "") {
        delete filteredData[key]
      }
    }

    const encrypted = encryptFields(filteredData, [...GLS_SENSITIVE_FIELDS])

    if (existing) {
      const updated = await this.updateGLSConfigs({
        id: existing.id,
        ...encrypted,
      })
      await this.invalidateConfigCache()
      return decryptFields(mapGLSConfigDTO(updated), [...GLS_SENSITIVE_FIELDS])
    }

    try {
      const created = await this.createGLSConfigs({
        ...encrypted,
        environment: this.environment_,
      })
      await this.invalidateConfigCache()
      return decryptFields(mapGLSConfigDTO(created), [...GLS_SENSITIVE_FIELDS])
    } catch (error) {
      const concurrent = await this.getConfig()
      if (!concurrent) {
        throw error
      }

      const updated = await this.updateGLSConfigs({
        id: concurrent.id,
        ...encrypted,
      })
      await this.invalidateConfigCache()
      return decryptFields(mapGLSConfigDTO(updated), [...GLS_SENSITIVE_FIELDS])
    }
  }

  /**
   * Effective config used by API calls. Cached briefly so multiple requests in
   * the same burst don't re-hit the DB. Returns null if disabled / unconfigured.
   */
  async getEffectiveConfig(): Promise<GLSOptions | null> {
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

  private async getCachedConfig(): Promise<GLSOptions | null | undefined> {
    if (!this.cacheService_) {
      return
    }
    const cached = (await this.cacheService_.get({
      key: this.getConfigCacheKey(),
    })) as unknown
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    if (isGLSOptions(cached)) {
      return cached
    }
    return
  }

  private toEffectiveOptions(
    config: GLSConfigDTO,
    apiPassword: string
  ): GLSOptions {
    return {
      api_password: apiPassword,
      environment: this.environment_,
      default_label_format: config.default_label_format as GLSLabelFormat,
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

  private async cacheEffectiveConfig(options: GLSOptions): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: this.getConfigCacheKey(),
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
      key: this.getConfigCacheKey(),
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  async invalidateConfigCache(): Promise<void> {
    this.client_ = null
    this.clientConfigFingerprint_ = null
    if (this.cacheService_) {
      await this.cacheService_.clear({ key: this.getConfigCacheKey() })
    }
  }

  async invalidateAllCaches(): Promise<void> {
    this.client_ = null
    this.clientConfigFingerprint_ = null
    if (this.cacheService_) {
      await this.cacheService_.clear({ tags: [CACHE_TAGS.ALL] })
      this.logger_.info("GLS: Invalidated all caches")
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

  private getConfigCacheKey(): string {
    return computeKey("config", { environment: this.environment_ })
  }

  private getBranchesCacheKey(): string {
    return computeKey("branches")
  }

  private async getClient(): Promise<GLSClient> {
    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS is disabled or not configured. Enable it in Settings → GLS."
      )
    }

    const fingerprint = JSON.stringify(config)
    if (this.client_ && this.clientConfigFingerprint_ === fingerprint) {
      return this.client_
    }

    this.client_ = new GLSClient(config)
    this.clientConfigFingerprint_ = fingerprint
    return this.client_
  }

  // ============================================
  // Public API
  // ============================================

  async createPacket(
    attributes: GLSPacketAttributes
  ): Promise<GLSCreatePacketResult> {
    const client = await this.getClient()
    return client.createPacket(attributes)
  }

  async cancelPacket(packetId: string | number): Promise<boolean> {
    const client = await this.getClient()
    const result = await client.cancelPacket(packetId)
    if (result) {
      this.logger_.info(`GLS: Packet ${packetId} cancelled`)
    } else {
      this.logger_.warn(`GLS: Cancellation failed for packet ${packetId}`)
    }
    return result
  }

  async getPacketStatus(
    packetId: string | number
  ): Promise<GLSPacketStatusRecord[]> {
    const client = await this.getClient()
    return client.packetStatus(packetId)
  }

  async downloadLabelPdf(
    packetId: string | number,
    format?: GLSLabelFormat,
    offset?: number
  ): Promise<Buffer> {
    const client = await this.getClient()
    return client.downloadLabelPdf(packetId, format, offset)
  }

  /**
   * Pickup-point (branch) list. Cached for 24h — safe to call on hot paths.
   */
  async getBranches(): Promise<GLSBranch[]> {
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: this.getBranchesCacheKey(),
      })) as GLSBranch[] | null
      if (cached) {
        return cached
      }
    }

    if (this.branchesRefresh_) {
      return this.branchesRefresh_
    }

    this.branchesRefresh_ = this.refreshBranches()
    try {
      return await this.branchesRefresh_
    } finally {
      this.branchesRefresh_ = null
    }
  }

  private async refreshBranches(): Promise<GLSBranch[]> {
    const client = await this.getClient()
    const branches = await client.getBranchList()

    if (this.cacheService_ && branches.length > 0) {
      await this.cacheService_.set({
        key: this.getBranchesCacheKey(),
        data: branches,
        ttl: CACHE_TTL.BRANCHES,
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
      })
    }

    return branches
  }
}
