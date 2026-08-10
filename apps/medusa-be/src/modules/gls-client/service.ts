import type { ICachingModuleService, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import {
  getErrorMessage,
  getRecordValue,
  isRecord,
  omitUndefined,
} from "@techsio/std/object"

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

type CachingDependency = Pick<
  ICachingModuleService,
  "clear" | "computeKey" | "get" | "set"
>

interface InjectedDependencies {
  logger: Logger
  [Modules.CACHING]?: CachingDependency
}

const isCachingDependency = (value: unknown): value is CachingDependency => {
  if (!isRecord(value)) {
    return false
  }
  return ["clear", "computeKey", "get", "set"].every(
    (method) => typeof getRecordValue(value, method) === "function",
  )
}

interface GLSModuleOptions {
  environment: GLSEnvironment
}

interface DisabledConfigCacheEntry {
  disabled: true
}

/**
 * Result of a cached effective-config lookup. `miss` (nothing usable cached,
 * the database has to be consulted) is deliberately distinct from `disabled`
 * (a cached negative answer that must be returned as-is).
 */
type CachedConfigLookup =
  | { options: GLSOptions; status: "hit" }
  | { status: "disabled" }
  | { status: "miss" }

const isDisabledConfigCacheEntry = (
  value: unknown,
): value is DisabledConfigCacheEntry =>
  isRecord(value) && getRecordValue(value, "disabled") === true

const GLS_COUNTRY_CODE_SET: ReadonlySet<string> = new Set(GLS_COUNTRY_CODES)
const GLS_PRINTER_TYPE_SET: ReadonlySet<string> = new Set(GLS_PRINTER_TYPES)

const isGLSEnvironment = (value: unknown): value is GLSEnvironment =>
  value === "testing" || value === "production"

const isGLSCountryCode = (value: unknown): value is GLSCountryCode =>
  typeof value === "string" && GLS_COUNTRY_CODE_SET.has(value)

const isGLSPrinterType = (value: unknown): value is GLSPrinterType =>
  typeof value === "string" && GLS_PRINTER_TYPE_SET.has(value)

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0

const cachedGLSOptionsSchema = z.object({
  client_number: z.number().positive(),
  country_code: z.enum(GLS_COUNTRY_CODES),
  environment: z.enum(["testing", "production"]),
  hide_phone_number_on_labels: z.boolean(),
  print_position: z.number().positive(),
  sender_city: z.string(),
  sender_country: z.string(),
  sender_email: z.string().optional(),
  sender_house_number: z.string(),
  sender_house_number_info: z.string().optional(),
  sender_name: z.string(),
  sender_phone: z.string().optional(),
  sender_street: z.string(),
  sender_zip_code: z.string(),
  type_of_printer: z.enum(GLS_PRINTER_TYPES),
  username: z.string(),
  webshop_engine: z.string().optional(),
})

type CachedGLSOptions = z.infer<typeof cachedGLSOptionsSchema>

const decodeCachedGLSOptions = (
  value: unknown,
): CachedGLSOptions | undefined => {
  const parsed = cachedGLSOptionsSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const toCachedOptions = ({
  password: _password,
  ...options
}: GLSOptions): CachedGLSOptions => options

const glsBranchSchema = z.object({
  branchType: z.string().optional(),
  city: z.string(),
  country: z.string(),
  currency: z.string().optional(),
  id: z.string(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  name: z.string(),
  nameStreet: z.string(),
  openingHours: z.string().optional(),
  street: z.string(),
  zip: z.string(),
})

const glsBranchArraySchema = z.array(glsBranchSchema)

const decodeGLSBranches = (value: unknown): GLSBranch[] | undefined => {
  const parsed = glsBranchArraySchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

const nullableString = (value: unknown): string | null =>
  typeof value === "string" ? value : null

const nullableNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null

const booleanValue = (value: unknown, defaultValue = false): boolean =>
  typeof value === "boolean" ? value : defaultValue

/**
 * Stored timestamps arrive as `Date` from the ORM. Strings and epoch numbers
 * are still accepted defensively; anything else falls back to "now" rather
 * than an Invalid Date.
 */
const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value)
  }

  return new Date()
}

const isUniqueConstraintError = (error: unknown): boolean => {
  const message = getErrorMessage(error)
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

// ============================================
// Usable configuration (credentials + pickup address)
// ============================================

const REQUIRED_PICKUP_FIELDS = [
  "sender_name",
  "sender_street",
  "sender_house_number",
  "sender_city",
  "sender_zip_code",
  "sender_country",
] as const satisfies readonly (keyof GLSConfigDTO)[]

/** Sender fields that stay optional in `GLSOptions` when unset in the config. */
const OPTIONAL_SENDER_FIELDS = [
  "sender_house_number_info",
  "sender_phone",
  "sender_email",
] as const satisfies readonly (keyof GLSConfigDTO & keyof GLSOptions)[]

type GLSPickupAddress = Record<(typeof REQUIRED_PICKUP_FIELDS)[number], string>

interface GLSCredentials {
  client_number: number
  password: string
  username: string
}

/** A stored config that carries everything a MyGLS API call requires. */
type UsableGLSConfig = GLSConfigDTO & GLSCredentials & GLSPickupAddress

const hasRequiredPickupAddress = (
  config: GLSConfigDTO,
): config is GLSConfigDTO & GLSPickupAddress =>
  REQUIRED_PICKUP_FIELDS.every((field) => isNonEmptyString(config[field]))

const hasRequiredCredentials = (
  config: GLSConfigDTO,
): config is GLSConfigDTO & GLSCredentials =>
  isNonEmptyString(config.username) &&
  isNonEmptyString(config.password) &&
  isPositiveNumber(config.client_number)

const isUsableConfig = (
  config: GLSConfigDTO | null,
): config is UsableGLSConfig =>
  config !== null &&
  config.is_enabled &&
  hasRequiredCredentials(config) &&
  hasRequiredPickupAddress(config)

const mapGLSConfigDTO = (config: unknown): GLSConfigDTO => {
  if (!isRecord(config)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record",
    )
  }

  const environment = getRecordValue(config, "environment")
  const id = getRecordValue(config, "id")
  const isEnabled = getRecordValue(config, "is_enabled")

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
    client_number: nullableNumber(getRecordValue(config, "client_number")),
    country_code: toCountryCode(getRecordValue(config, "country_code")),
    created_at: toDate(getRecordValue(config, "created_at")),
    environment,
    hide_phone_number_on_labels: booleanValue(
      getRecordValue(config, "hide_phone_number_on_labels"),
    ),
    id,
    is_enabled: isEnabled,
    password: nullableString(getRecordValue(config, "password")),
    print_position: toPrintPosition(getRecordValue(config, "print_position")),
    sender_city: nullableString(getRecordValue(config, "sender_city")),
    sender_country: nullableString(getRecordValue(config, "sender_country")),
    sender_email: nullableString(getRecordValue(config, "sender_email")),
    sender_house_number: nullableString(
      getRecordValue(config, "sender_house_number"),
    ),
    sender_house_number_info: nullableString(
      getRecordValue(config, "sender_house_number_info"),
    ),
    sender_name: nullableString(getRecordValue(config, "sender_name")),
    sender_phone: nullableString(getRecordValue(config, "sender_phone")),
    sender_street: nullableString(getRecordValue(config, "sender_street")),
    sender_zip_code: nullableString(getRecordValue(config, "sender_zip_code")),
    type_of_printer: toPrinterType(getRecordValue(config, "type_of_printer")),
    updated_at: toDate(getRecordValue(config, "updated_at")),
    username: nullableString(getRecordValue(config, "username")),
    webshop_engine: nullableString(getRecordValue(config, "webshop_engine")),
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
  private _client: GLSClient | null = null
  private _clientConfigFingerprint: string | null = null
  private _branchesRefresh: Promise<GLSBranch[]> | null = null
  protected readonly _logger: Logger
  protected readonly _environment: GLSEnvironment
  protected readonly _cacheService: CachingDependency | null

  constructor(container: InjectedDependencies, options: GLSModuleOptions) {
    super(container, options)
    this._logger = container.logger
    this._environment = options.environment

    this._cacheService = safeResolve(
      container,
      Modules.CACHING,
      isCachingDependency,
    )

    if (!this._cacheService) {
      this._logger.warn(
        "GLS: Cache service not available. Using local-only mode (not suitable for multi-container).",
      )
    }

    this._logger.info(
      `GLS: Module service initialized (${this._environment} environment)`,
    )
  }

  async getEnvironment(): Promise<GLSEnvironment> {
    return await Promise.resolve(this._environment)
  }

  async getConfig(): Promise<GLSConfigDTO | null> {
    const configs = await this.listGLSConfigs(
      { environment: this._environment },
      { take: 1 },
    )
    const [config] = configs
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

    // GLS_SENSITIVE_FIELDS is ["password"]; the key is dropped statically so
    // the payload keeps its declared shape.
    const filteredData = { ...data }
    if (filteredData.password === "") {
      delete filteredData.password
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
        environment: this._environment,
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
    if (cached.status === "hit") {
      return cached.options
    }
    if (cached.status === "disabled") {
      return null
    }

    const config = await this.getConfig()
    if (!isUsableConfig(config)) {
      await this.cacheDisabledConfig()
      return null
    }

    const options = this.toEffectiveOptions(config)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async getCachedConfig(): Promise<CachedConfigLookup> {
    if (!this._cacheService) {
      return { status: "miss" }
    }

    const cached: unknown = await this._cacheService.get({
      key: await this.getConfigCacheKey(),
    })

    if (isDisabledConfigCacheEntry(cached)) {
      return { status: "disabled" }
    }

    const decodedOptions = decodeCachedGLSOptions(cached)
    if (decodedOptions === undefined) {
      return { status: "miss" }
    }

    // The password is never cached, so it is re-read from the database.
    const config = await this.getConfig()
    if (
      config === null ||
      !config.is_enabled ||
      !isNonEmptyString(config.password)
    ) {
      await this.cacheDisabledConfig()
      return { status: "disabled" }
    }

    return {
      options: { ...omitUndefined(decodedOptions), password: config.password },
      status: "hit",
    }
  }

  /**
   * The caller proves the config is usable via `isUsableConfig`, so the
   * required credential and pickup-address fields are non-null by type.
   */
  private toEffectiveOptions(config: UsableGLSConfig): GLSOptions {
    const options: GLSOptions = {
      client_number: config.client_number,
      country_code: toCountryCode(config.country_code),
      environment: this._environment,
      hide_phone_number_on_labels: config.hide_phone_number_on_labels,
      password: config.password,
      print_position: toPrintPosition(config.print_position),
      sender_city: config.sender_city,
      sender_country: config.sender_country,
      sender_house_number: config.sender_house_number,
      sender_name: config.sender_name,
      sender_street: config.sender_street,
      sender_zip_code: config.sender_zip_code,
      type_of_printer: toPrinterType(config.type_of_printer),
      username: config.username,
      webshop_engine: config.webshop_engine ?? DEFAULT_WEBSHOP_ENGINE,
    }

    for (const field of OPTIONAL_SENDER_FIELDS) {
      const value = config[field]
      if (value !== null) {
        options[field] = value
      }
    }

    return options
  }

  private async cacheEffectiveConfig(options: GLSOptions): Promise<void> {
    if (!this._cacheService) {
      return
    }
    await this._cacheService.set({
      data: toCachedOptions(options),
      key: await this.getConfigCacheKey(),
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  private async cacheDisabledConfig(): Promise<void> {
    if (!this._cacheService) {
      return
    }
    await this._cacheService.set({
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      key: await this.getConfigCacheKey(),
      tags: [CACHE_TAGS.ALL],
      ttl: CACHE_TTL.CONFIG,
    })
  }

  async invalidateConfigCache(): Promise<void> {
    this._client = null
    this._clientConfigFingerprint = null
    if (this._cacheService) {
      await this._cacheService.clear({ key: await this.getConfigCacheKey() })
    }
  }

  async invalidateAllCaches(): Promise<void> {
    this._client = null
    this._clientConfigFingerprint = null
    if (this._cacheService) {
      await this._cacheService.clear({ tags: [CACHE_TAGS.ALL] })
      this._logger.info("GLS: Invalidated all caches")
    }
  }

  async invalidateBranchCache(): Promise<void> {
    if (this._cacheService) {
      await this._cacheService.clear({ tags: [CACHE_TAGS.BRANCHES] })
    }
  }

  private async getConfigCacheKey(): Promise<string> {
    return await this.computeCacheKey("config", {
      environment: this._environment,
    })
  }

  private async getBranchesCacheKey(): Promise<string> {
    return await this.computeCacheKey("branches")
  }

  private async computeCacheKey(
    scope: string,
    parts: Partial<{ environment: GLSEnvironment }> = {},
  ): Promise<string> {
    if (!this._cacheService) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Cache service is not available",
      )
    }

    return await this._cacheService.computeKey({
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
    if (this._client && this._clientConfigFingerprint === fingerprint) {
      return this._client
    }

    this._client = new GLSClient(config)
    this._clientConfigFingerprint = fingerprint
    return this._client
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
      this._logger.info(`GLS: Packet ${packetId} cancelled`)
    } else {
      this._logger.warn(`GLS: Cancellation failed for packet ${packetId}`)
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
    if (this._cacheService) {
      const cached: unknown = await this._cacheService.get({
        key: await this.getBranchesCacheKey(),
      })
      const decodedBranches = decodeGLSBranches(cached)
      if (decodedBranches !== undefined) {
        return decodedBranches
      }
    }

    if (this._branchesRefresh) {
      return await this._branchesRefresh
    }

    this._branchesRefresh = this.refreshBranches()
    try {
      return await this._branchesRefresh
    } finally {
      this._branchesRefresh = null
    }
  }

  private async refreshBranches(): Promise<GLSBranch[]> {
    const client = await this.getClient()
    const branches = await client.getBranchList()

    if (this._cacheService && branches.length > 0) {
      await this._cacheService.set({
        data: branches,
        key: await this.getBranchesCacheKey(),
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
        ttl: CACHE_TTL.BRANCHES,
      })
    }

    return branches
  }
}
