import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import { getRecordValue, isRecord, omitUndefined } from "@techsio/std/object"

import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import {
  INTEGRATION_CONFIG_NAMES,
  retrieveIntegrationConfig,
} from "../api-store/integration-config"
import type { IntegrationConfigContainer } from "../api-store/integration-config"
import { PacketaClient } from "./client"
import PacketaConfig from "./models/packeta-config"
import { packetaBranchSchema } from "./schemas"
import { PACKETA_SENSITIVE_FIELDS } from "./types"
import type {
  PacketaBranch,
  PacketaConfigDTO,
  PacketaCreatePacketResult,
  PacketaEnvironment,
  PacketaLabelFormat,
  PacketaOptions,
  PacketaPacketAttributes,
  PacketaPacketStatusRecord,
  UpdatePacketaConfigInput,
} from "./types"

const CACHE_KEYS = {
  BRANCHES: "packeta:branches",
  CONFIG: "packeta:config",
} as const

const CACHE_TAGS = {
  ALL: "packeta",
  BRANCHES: "packeta:branches",
} as const

const CACHE_TTL = {
  BRANCHES: 24 * 3600,
  CONFIG: 60,
} as const

interface CachingDependency {
  clear: ICachingModuleService["clear"]
  get: ICachingModuleService["get"]
  set: ICachingModuleService["set"]
}

interface InjectedDependencies extends IntegrationConfigContainer {
  logger: Logger
  [Modules.CACHING]?: CachingDependency
}

const isCachingDependency = (value: unknown): value is CachingDependency =>
  isRecord(value) &&
  typeof getRecordValue(value, "clear") === "function" &&
  typeof getRecordValue(value, "get") === "function" &&
  typeof getRecordValue(value, "set") === "function"

interface PacketaModuleOptions {
  environment: PacketaEnvironment
}

interface DisabledConfigCacheEntry {
  disabled: true
}

const isDisabledConfigCacheEntry = (
  value: unknown,
): value is DisabledConfigCacheEntry =>
  isRecord(value) && getRecordValue(value, "disabled") === true

const packetaConfigSchema = z.object({
  api_password: z.string().nullable(),
  cod_bank_account: z.string().nullable(),
  cod_bank_code: z.string().nullable(),
  cod_iban: z.string().nullable(),
  cod_swift: z.string().nullable(),
  created_at: z.date(),
  default_label_format: z.string(),
  default_label_offset: z.number(),
  environment: z.enum(["testing", "production"]),
  eshop_id: z.string().nullable(),
  id: z.string(),
  is_enabled: z.boolean(),
  sender_city: z.string().nullable(),
  sender_country: z.string().nullable(),
  sender_email: z.string().nullable(),
  sender_label: z.string().nullable(),
  sender_name: z.string().nullable(),
  sender_phone: z.string().nullable(),
  sender_street: z.string().nullable(),
  sender_zip_code: z.string().nullable(),
  updated_at: z.date(),
})

const packetaOptionsSchema = z.object({
  api_password: z.string(),
  cod_bank_account: z.string().optional(),
  cod_bank_code: z.string().optional(),
  cod_iban: z.string().optional(),
  cod_swift: z.string().optional(),
  default_label_format: z.enum(["A6", "A7"]),
  default_label_offset: z.number(),
  environment: z.enum(["testing", "production"]),
  eshop_id: z.string().optional(),
  pickup_points_api_key: z.string().optional(),
  sender_city: z.string().optional(),
  sender_country: z.string().optional(),
  sender_email: z.string().optional(),
  sender_label: z.string().optional(),
  sender_name: z.string().optional(),
  sender_phone: z.string().optional(),
  sender_street: z.string().optional(),
  sender_zip_code: z.string().optional(),
})

const toPacketaConfigDTO = (value: unknown): PacketaConfigDTO => {
  const parsed = packetaConfigSchema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Packeta: Stored configuration has an invalid shape",
    )
  }

  return parsed.data
}

const toPacketaLabelFormat = (value: string): PacketaLabelFormat => {
  const parsed = z.enum(["A6", "A7"]).safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Packeta: Unsupported label format "${value}"`,
    )
  }

  return parsed.data
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
  private client: PacketaClient | null = null
  protected readonly container: InjectedDependencies
  protected readonly logger: Logger
  protected readonly environment: PacketaEnvironment
  protected readonly cacheService: CachingDependency | null

  constructor(container: InjectedDependencies, options: PacketaModuleOptions) {
    super(container, options)
    this.container = container
    this.logger = container.logger
    this.environment = options.environment

    this.cacheService = safeResolve(
      container,
      Modules.CACHING,
      isCachingDependency,
    )

    if (this.cacheService === null) {
      this.logger.warn(
        "Packeta: Cache service not available. Using local-only mode (not suitable for multi-container).",
      )
    }

    this.logger.info(
      `Packeta: Module service initialized (${this.environment} environment)`,
    )
  }

  async getEnvironment(): Promise<PacketaEnvironment> {
    return await Promise.resolve(this.environment)
  }

  // ============================================
  // Config Management (DB-stored, encrypted)
  // ============================================

  async getConfig(): Promise<PacketaConfigDTO | null> {
    const configs = await this.listPacketaConfigs(
      { environment: this.environment },
      { take: 1 },
    )
    const [config] = configs
    if (config === undefined) {
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
    data: UpdatePacketaConfigInput,
  ): Promise<PacketaConfigDTO> {
    const existing = await this.getConfig()

    const filteredData = { ...data }
    if (filteredData.api_password === "") {
      delete filteredData.api_password
    }
    if (filteredData.cod_bank_account === "") {
      delete filteredData.cod_bank_account
    }
    if (filteredData.cod_bank_code === "") {
      delete filteredData.cod_bank_code
    }
    if (filteredData.cod_iban === "") {
      delete filteredData.cod_iban
    }
    if (filteredData.cod_swift === "") {
      delete filteredData.cod_swift
    }

    const encrypted = encryptFields(filteredData, [...PACKETA_SENSITIVE_FIELDS])

    if (existing !== null) {
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
      environment: this.environment,
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
    if (
      config?.is_enabled !== true ||
      apiPassword === null ||
      apiPassword === undefined ||
      apiPassword.length === 0
    ) {
      await this.cacheDisabledConfig()
      return null
    }

    const options = await this.toEffectiveOptions(config, apiPassword)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedConfig(): Promise<PacketaOptions | null | undefined> {
    if (this.cacheService === null) {
      return undefined
    }
    const cached: unknown = await this.cacheService.get({
      key: CACHE_KEYS.CONFIG,
    })
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    if (cached === null || cached === undefined) {
      return undefined
    }

    const parsed = packetaOptionsSchema.safeParse(cached)
    if (!parsed.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Packeta: Cached configuration has an invalid shape",
      )
    }

    return omitUndefined(parsed.data)
  }

  private async toEffectiveOptions(
    config: PacketaConfigDTO,
    apiPassword: string,
  ): Promise<PacketaOptions> {
    const pickupPointsConfig = await retrieveIntegrationConfig(
      this.container,
      INTEGRATION_CONFIG_NAMES.PACKETA_PICKUP_POINTS,
    )
    const pickupPointsApiKey =
      pickupPointsConfig?.enabled === true &&
      pickupPointsConfig.api_key !== null &&
      pickupPointsConfig.api_key !== ""
        ? pickupPointsConfig.api_key
        : undefined
    const options: PacketaOptions = {
      api_password: apiPassword,
      default_label_format: toPacketaLabelFormat(config.default_label_format),
      default_label_offset: config.default_label_offset,
      environment: this.environment,
      ...(pickupPointsApiKey === undefined
        ? {}
        : { pickup_points_api_key: pickupPointsApiKey }),
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
    if (this.cacheService === null) {
      return
    }
    await this.cacheService.set({
      data: options,
      key: CACHE_KEYS.CONFIG,
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  private async cacheDisabledConfig(): Promise<void> {
    if (this.cacheService === null) {
      return
    }
    await this.cacheService.set({
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      key: CACHE_KEYS.CONFIG,
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  async invalidateConfigCache(): Promise<void> {
    this.client = null
    if (this.cacheService !== null) {
      await this.cacheService.clear({ key: CACHE_KEYS.CONFIG })
    }
  }

  async invalidateAllCaches(): Promise<void> {
    this.client = null
    if (this.cacheService !== null) {
      await this.cacheService.clear({ tags: [CACHE_TAGS.ALL] })
      this.logger.info("Packeta: Invalidated all caches")
    }
  }

  async invalidateBranchCache(): Promise<void> {
    if (this.cacheService !== null) {
      await this.cacheService.clear({ tags: [CACHE_TAGS.BRANCHES] })
    }
  }

  // ============================================
  // Lazy Client
  // ============================================

  private async getClient(): Promise<PacketaClient> {
    if (this.client !== null) {
      return this.client
    }

    const config = await this.getEffectiveConfig()
    if (config === null) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Packeta is disabled or not configured. Enable it in Settings → Packeta.",
      )
    }

    this.client = new PacketaClient(config)
    return this.client
  }

  // ============================================
  // Public API
  // ============================================

  async createPacket(
    attributes: PacketaPacketAttributes,
  ): Promise<PacketaCreatePacketResult> {
    const client = await this.getClient()
    return await client.createPacket(attributes)
  }

  async cancelPacket(packetId: number): Promise<boolean> {
    const client = await this.getClient()
    const result = await client.cancelPacket(packetId)
    if (result) {
      this.logger.info(`Packeta: Packet ${packetId} cancelled`)
    } else {
      this.logger.warn(`Packeta: Cancellation failed for packet ${packetId}`)
    }
    return result
  }

  async getPacketStatus(
    packetId: number,
  ): Promise<PacketaPacketStatusRecord[]> {
    const client = await this.getClient()
    return await client.packetStatus(packetId)
  }

  async downloadLabelPdf(
    packetId: number,
    format?: PacketaLabelFormat,
    offset?: number,
  ): Promise<Buffer> {
    const client = await this.getClient()
    return await client.downloadLabelPdf(packetId, format, offset)
  }

  /**
   * Pickup-point (branch) list. Cached for 24h — safe to call on hot paths.
   */
  async getBranches(): Promise<PacketaBranch[]> {
    if (this.cacheService !== null) {
      const cached: unknown = await this.cacheService.get({
        key: CACHE_KEYS.BRANCHES,
      })
      if (cached !== null && cached !== undefined) {
        const parsed = z.array(packetaBranchSchema).safeParse(cached)
        if (!parsed.success) {
          throw new MedusaError(
            MedusaError.Types.UNEXPECTED_STATE,
            "Packeta: Cached branch list has an invalid shape",
          )
        }
        return parsed.data
      }
    }

    const client = await this.getClient()
    const branches = await client.getBranchList()

    if (this.cacheService !== null && branches.length > 0) {
      await this.cacheService.set({
        data: branches,
        key: CACHE_KEYS.BRANCHES,
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
        ttl: CACHE_TTL.BRANCHES,
      })
    }

    return branches
  }
}
