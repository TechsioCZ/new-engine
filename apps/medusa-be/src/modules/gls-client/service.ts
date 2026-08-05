import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"

import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { GLSClient } from "./client"
import GLSConfig from "./models/gls-config"
import {
  GLS_COUNTRY_CODES,
  GLS_PRINTER_TYPES,
  GLS_SENSITIVE_FIELDS,
} from "./types"
import type {
  GLSBranch,
  GLSConfigDTO,
  GLSCountryCode,
  GLSCreatePacketResult,
  GLSEnvironment,
  GLSOptions,
  GLSPacketAttributes,
  GLSPacketStatusRecord,
  GLSPrinterType,
  UpdateGLSConfigInput,
} from "./types"

const DEFAULT_COUNTRY_CODE: GLSCountryCode = "SK"
const DEFAULT_PRINTER_TYPE: GLSPrinterType = "A4_2x2"
const DEFAULT_WEBSHOP_ENGINE = "new-engine-medusa"

const CACHE_TAGS = {
  ALL: "gls",
  BRANCHES: "gls:branches",
} as const

const CACHE_TTL = {
  BRANCHES: 24 * 3600,
  CONFIG: 60,
} as const

interface InjectedDependencies {
  logger: Logger
  [Modules.CACHING]?: ICachingModuleService
}

interface GLSModuleOptions {
  environment: GLSEnvironment
}

interface DisabledConfigCacheEntry {
  disabled: true
}

type CachedGLSOptions = Omit<GLSOptions, "password">

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isDisabledConfigCacheEntry = (
  value: unknown,
): value is DisabledConfigCacheEntry =>
  isRecord(value) && value.disabled === true

const isGLSEnvironment = (value: unknown): value is GLSEnvironment =>
  value === "testing" || value === "production"

const isGLSCountryCode = (value: unknown): value is GLSCountryCode =>
  typeof value === "string" &&
  (GLS_COUNTRY_CODES as readonly string[]).includes(value)

const isGLSPrinterType = (value: unknown): value is GLSPrinterType =>
  typeof value === "string" &&
  (GLS_PRINTER_TYPES as readonly string[]).includes(value)

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string"

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const isBoolean = (value: unknown): value is boolean =>
  typeof value === "boolean"

const isCachedGLSOptions = (value: unknown): value is CachedGLSOptions =>
  isRecord(value) &&
  !("password" in value) &&
  typeof value.username === "string" &&
  isPositiveNumber(value.client_number) &&
  isGLSEnvironment(value.environment) &&
  isGLSCountryCode(value.country_code) &&
  isOptionalString(value.webshop_engine) &&
  isGLSPrinterType(value.type_of_printer) &&
  isPositiveNumber(value.print_position) &&
  isBoolean(value.hide_phone_number_on_labels) &&
  typeof value.sender_name === "string" &&
  typeof value.sender_street === "string" &&
  typeof value.sender_house_number === "string" &&
  isOptionalString(value.sender_house_number_info) &&
  typeof value.sender_city === "string" &&
  typeof value.sender_zip_code === "string" &&
  typeof value.sender_country === "string" &&
  isOptionalString(value.sender_phone) &&
  isOptionalString(value.sender_email)

const toCachedOptions = ({
  password: _password,
  ...options
}: GLSOptions): CachedGLSOptions => options

const isGLSBranch = (value: unknown): value is GLSBranch =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.nameStreet === "string" &&
  typeof value.street === "string" &&
  typeof value.city === "string" &&
  typeof value.zip === "string" &&
  typeof value.country === "string"

const isGLSBranchArray = (value: unknown): value is GLSBranch[] =>
  Array.isArray(value) && value.every(isGLSBranch)

const nullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const nullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const booleanValue = (value: unknown, defaultValue = false): boolean =>
  typeof value === "boolean" ? value : defaultValue

const toDate = (value: unknown): Date =>
  value instanceof Date ? value : new Date(String(value ?? Date.now()))

const isUniqueConstraintError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes("unique constraint") || message.includes("duplicate key")
  )
}

const toCountryCode = (value: unknown): GLSCountryCode =>
  isGLSCountryCode(value) ? value : DEFAULT_COUNTRY_CODE

const toPrinterType = (value: unknown): GLSPrinterType =>
  isGLSPrinterType(value) ? value : DEFAULT_PRINTER_TYPE

const toPrintPosition = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return 1
  }

  return Math.min(Math.max(value, 1), 4)
}

const hasRequiredPickupAddress = (config: GLSConfigDTO): boolean =>
  Boolean(
    config.sender_name &&
    config.sender_street &&
    config.sender_house_number &&
    config.sender_city &&
    config.sender_zip_code &&
    config.sender_country,
  )

const mapGLSConfigDTO = (config: unknown): GLSConfigDTO => {
  if (!isRecord(config)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record",
    )
  }

  const id: unknown = config.id
  const environment: unknown = config.environment
  const isEnabled: unknown = config.is_enabled

  if (
    typeof id !== "string" ||
    !isGLSEnvironment(environment) ||
    typeof isEnabled !== "boolean"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record",
    )
  }

  return {
    client_number: nullableNumber(config.client_number),
    country_code: toCountryCode(config.country_code),
    created_at: toDate(config.created_at),
    environment,
    hide_phone_number_on_labels: booleanValue(
      config.hide_phone_number_on_labels,
    ),
    id,
    is_enabled: isEnabled,
    password: nullableString(config.password),
    print_position: toPrintPosition(config.print_position),
    sender_city: nullableString(config.sender_city),
    sender_country: nullableString(config.sender_country),
    sender_email: nullableString(config.sender_email),
    sender_house_number: nullableString(config.sender_house_number),
    sender_house_number_info: nullableString(config.sender_house_number_info),
    sender_name: nullableString(config.sender_name),
    sender_phone: nullableString(config.sender_phone),
    sender_street: nullableString(config.sender_street),
    sender_zip_code: nullableString(config.sender_zip_code),
    type_of_printer: toPrinterType(config.type_of_printer),
    updated_at: toDate(config.updated_at),
    username: nullableString(config.username),
    webshop_engine: nullableString(config.webshop_engine),
  }
}

/**
 * MyGLS Client Module Service.
 *
 * Stores MyGLS credentials/configuration, exposes a cached effective runtime
 * configuration, and lazily constructs the JSON MyGLS API client.
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
      Modules.CACHING,
    )

    if (!this.cacheService_) {
      this.logger_.warn(
        "GLS: Cache service not available. Using local-only mode (not suitable for multi-container).",
      )
    }

    this.logger_.info(
      `GLS: Module service initialized (${this.environment_} environment)`,
    )
  }

  async getEnvironment(): Promise<GLSEnvironment> {
    return this.environment_
  }

  async getConfig(): Promise<GLSConfigDTO | null> {
    const configs = await this.listGLSConfigs(
      { environment: this.environment_ },
      { take: 1 },
    )
    const config = configs[0]
    if (!config) {
      return null
    }
    return decryptFields(mapGLSConfigDTO(config), [...GLS_SENSITIVE_FIELDS])
  }

  /**
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
      if (!isUniqueConstraintError(error)) {
        throw error
      }

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
   * Effective config used by API calls. Returns null if disabled or missing
   * required MyGLS credentials/pickup-address fields.
   */
  async getEffectiveConfig(): Promise<GLSOptions | null> {
    const cached = await this.getCachedConfig()
    if (cached !== undefined) {
      return cached
    }

    const config = await this.getConfig()
    if (
      !(
        config?.is_enabled &&
        config.username &&
        config.password &&
        isPositiveNumber(config.client_number) &&
        hasRequiredPickupAddress(config)
      )
    ) {
      await this.cacheDisabledConfig()
      return null
    }

    const options = this.toEffectiveOptions(config)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedConfig(): Promise<GLSOptions | null | undefined> {
    if (!this.cacheService_) {
      return
    }
    const cached = (await this.cacheService_.get({
      key: await this.getConfigCacheKey(),
    })) as unknown
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    if (isCachedGLSOptions(cached)) {
      const config = await this.getConfig()
      if (!(config?.is_enabled && config.password)) {
        await this.cacheDisabledConfig()
        return null
      }
      return { ...cached, password: config.password }
    }
    return
  }

  private toEffectiveOptions(config: GLSConfigDTO): GLSOptions {
    if (!(config.username && config.password && config.client_number)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Missing MyGLS credentials",
      )
    }

    if (!hasRequiredPickupAddress(config)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Missing pickup address fields",
      )
    }

    return {
      client_number: config.client_number,
      country_code: toCountryCode(config.country_code),
      environment: this.environment_,
      hide_phone_number_on_labels: config.hide_phone_number_on_labels,
      password: config.password,
      print_position: toPrintPosition(config.print_position),
      sender_city: config.sender_city as string,
      sender_country: config.sender_country as string,
      sender_email: config.sender_email ?? undefined,
      sender_house_number: config.sender_house_number as string,
      sender_house_number_info: config.sender_house_number_info ?? undefined,
      sender_name: config.sender_name as string,
      sender_phone: config.sender_phone ?? undefined,
      sender_street: config.sender_street as string,
      sender_zip_code: config.sender_zip_code as string,
      type_of_printer: toPrinterType(config.type_of_printer),
      username: config.username,
      webshop_engine: config.webshop_engine ?? DEFAULT_WEBSHOP_ENGINE,
    }
  }

  private async cacheEffectiveConfig(options: GLSOptions): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      data: toCachedOptions(options),
      key: await this.getConfigCacheKey(),
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  private async cacheDisabledConfig(): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      key: await this.getConfigCacheKey(),
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  async invalidateConfigCache(): Promise<void> {
    this.client_ = null
    this.clientConfigFingerprint_ = null
    if (this.cacheService_) {
      await this.cacheService_.clear({ key: await this.getConfigCacheKey() })
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

  private async getConfigCacheKey(): Promise<string> {
    return await this.computeCacheKey("config", {
      environment: this.environment_,
    })
  }

  private async getBranchesCacheKey(): Promise<string> {
    return await this.computeCacheKey("branches")
  }

  private async computeCacheKey(
    scope: string,
    parts: Record<string, unknown> = {},
  ): Promise<string> {
    if (!this.cacheService_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Cache service is not available",
      )
    }

    return await this.cacheService_.computeKey({
      module: "gls",
      scope,
      ...parts,
    })
  }

  private async getClient(): Promise<GLSClient> {
    const config = await this.getEffectiveConfig()
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS is disabled or not configured. Enable it in Settings → GLS and fill MyGLS credentials plus pickup address.",
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

  async createPacket(
    attributes: GLSPacketAttributes,
  ): Promise<GLSCreatePacketResult> {
    const client = await this.getClient()
    return await client.createPacket(attributes)
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
    parcelNumber: string | number,
  ): Promise<GLSPacketStatusRecord[]> {
    const client = await this.getClient()
    return await client.packetStatus(parcelNumber)
  }

  async downloadLabelPdf(packetId: string | number): Promise<Buffer> {
    const client = await this.getClient()
    return await client.downloadLabelPdf(packetId)
  }

  async downloadLabelsPdf(packetIds: (string | number)[]): Promise<Buffer> {
    const client = await this.getClient()
    return await client.downloadLabelsPdf(packetIds)
  }

  /** Pickup-point list from MyGLS MasterDataService, cached for 24h. */
  async getBranches(): Promise<GLSBranch[]> {
    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: await this.getBranchesCacheKey(),
      })) as unknown
      if (isGLSBranchArray(cached)) {
        return cached
      }
    }

    if (this.branchesRefresh_) {
      return await this.branchesRefresh_
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
        data: branches,
        key: await this.getBranchesCacheKey(),
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
        ttl: CACHE_TTL.BRANCHES,
      })
    }

    return branches
  }
}
