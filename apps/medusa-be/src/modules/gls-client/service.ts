import { randomUUID } from "node:crypto"
import type { ICachingModuleService, ILockingModule, Logger } from "@medusajs/framework/types"
import { MedusaError, MedusaService, Modules } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import { safeResolve } from "../../utils/safe-resolve"
import { GLSClient } from "./client"
import GLSConfig from "./models/gls-config"
import GLSFulfillmentAttempt from "./models/gls-fulfillment-attempt"
import {
  GLS_COUNTRY_CODES,
  GLS_PRINTER_TYPES,
  GLS_SENSITIVE_FIELDS,
  type GLSBranch,
  type GLSConfigDTO,
  type GLSConfigReference,
  type GLSCountryCode,
  type GLSCreatePacketResult,
  type GLSCreateOrRecoverPacketInput,
  type GLSEnvironment,
  type GLSOptions,
  type GLSPacketAttributes,
  type GLSPacketStatusRecord,
  type GLSPrinterType,
  type UpdateGLSConfigInput,
} from "./types"

const DEFAULT_COUNTRY_CODE: GLSCountryCode = "SK"
const DEFAULT_PRINTER_TYPE: GLSPrinterType = "A4_2x2"

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
  [Modules.LOCKING]: ILockingModule
}

type DisabledConfigCacheEntry = {
  disabled: true
}

type CachedGLSOptions = Omit<GLSOptions, "password">

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isDisabledConfigCacheEntry = (
  value: unknown
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
  typeof value.config_id === "string" &&
  isPositiveNumber(value.client_number) &&
  isGLSEnvironment(value.environment) &&
  isGLSCountryCode(value.country_code) &&
  Array.isArray(value.supported_countries) &&
  value.supported_countries.every(isGLSCountryCode) &&
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
      config.sender_country
  )

const hasRequiredEnabledConfiguration = (config: GLSConfigDTO): boolean => Boolean(
  config.is_enabled &&
  config.username &&
  config.password &&
  config.client_number &&
  config.supported_countries.length > 0 &&
  hasRequiredPickupAddress(config)
)

const normalizeConfigUpdate = (data: UpdateGLSConfigInput): UpdateGLSConfigInput => {
  const normalized = { ...data }
  for (const field of GLS_SENSITIVE_FIELDS) {
    const key = field as keyof UpdateGLSConfigInput
    if (normalized[key] === "") {
      delete normalized[key]
    }
  }

  if (normalized.supported_countries) {
    normalized.supported_countries = Array.from(new Set(normalized.supported_countries))
  }

  return normalized
}

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
  const isActive: unknown = config.is_active

  if (
    typeof id !== "string" ||
    !isGLSEnvironment(environment) ||
    typeof isEnabled !== "boolean" ||
    typeof isActive !== "boolean"
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "GLS: Invalid config record"
    )
  }

  return {
    id,
    environment,
    is_active: isActive,
    is_enabled: isEnabled,
    username: nullableString(config.username),
    password: nullableString(config.password),
    client_number: nullableNumber(config.client_number),
    country_code: toCountryCode(config.country_code),
    supported_countries: Array.isArray(config.supported_countries)
      ? config.supported_countries.filter(isGLSCountryCode)
      : [],
    type_of_printer: toPrinterType(config.type_of_printer),
    print_position: toPrintPosition(config.print_position),
    hide_phone_number_on_labels: booleanValue(
      config.hide_phone_number_on_labels
    ),
    sender_name: nullableString(config.sender_name),
    sender_street: nullableString(config.sender_street),
    sender_house_number: nullableString(config.sender_house_number),
    sender_house_number_info: nullableString(config.sender_house_number_info),
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
 * MyGLS Client Module Service.
 *
 * Stores MyGLS credentials/configuration, exposes a cached effective runtime
 * configuration, and lazily constructs the JSON MyGLS API client.
 */
export class GLSClientModuleService extends MedusaService({
  GLSConfig,
  GLSFulfillmentAttempt,
}) {
  private client_: GLSClient | null = null
  private clientConfigFingerprint_: string | null = null
  private readonly branchesRefresh_: Map<string, Promise<GLSBranch[]>> = new Map()
  protected readonly logger_: Logger
  protected readonly cacheService_: ICachingModuleService | null
  protected readonly lockingService_: ILockingModule

  constructor(container: InjectedDependencies, options: Record<string, never> = {}) {
    super(container, options)
    this.logger_ = container.logger

    this.cacheService_ = safeResolve<ICachingModuleService>(
      container,
      Modules.CACHING
    )
    this.lockingService_ = container[Modules.LOCKING]

    if (!this.cacheService_) {
      this.logger_.warn(
        "GLS: Cache service not available. Using local-only mode (not suitable for multi-container)."
      )
    }

    this.logger_.info("GLS: Module service initialized with Admin-managed profiles")
  }

  async getEnvironment(): Promise<GLSEnvironment> {
    const config = await this.getActiveConfig()
    return config.environment
  }

  async listConfigProfiles(): Promise<GLSConfigDTO[]> {
    const configs = await this.listGLSConfigs({}, { order: { environment: "ASC" } })
    return configs.map((config) => decryptFields(mapGLSConfigDTO(config), [...GLS_SENSITIVE_FIELDS]))
  }

  async getConfig(environment?: GLSEnvironment): Promise<GLSConfigDTO | null> {
    if (!environment) {
      return this.getActiveConfig()
    }

    const configs = await this.listGLSConfigs({ environment }, { take: 1 })
    const config = configs[0]
    if (!config) {
      return null
    }
    return decryptFields(mapGLSConfigDTO(config), [...GLS_SENSITIVE_FIELDS])
  }

  async getActiveConfig(): Promise<GLSConfigDTO> {
    const configs = await this.listGLSConfigs({ is_active: true }, { take: 2 })
    if (configs.length !== 1) {
      throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "GLS must have exactly one active configuration profile")
    }

    return decryptFields(mapGLSConfigDTO(configs[0]), [...GLS_SENSITIVE_FIELDS])
  }

  /**
   * Empty string on a sensitive field = keep existing value.
   * null on a sensitive field = clear it.
   */
  async updateConfig(environment: GLSEnvironment, data: UpdateGLSConfigInput): Promise<GLSConfigDTO> {
    const existing = await this.getConfig(environment)
    const filteredData = normalizeConfigUpdate(data)
    const encrypted = encryptFields(filteredData, [...GLS_SENSITIVE_FIELDS])

    const proposedConfig = {
      ...existing,
      ...filteredData,
      environment,
      is_enabled: filteredData.is_enabled ?? existing?.is_enabled ?? false,
      username: filteredData.username ?? existing?.username ?? null,
      password: filteredData.password === undefined ? existing?.password ?? null : filteredData.password,
      client_number: filteredData.client_number === undefined ? existing?.client_number ?? null : filteredData.client_number,
      supported_countries: filteredData.supported_countries ?? existing?.supported_countries ?? [],
    } as GLSConfigDTO
    if (proposedConfig.is_enabled && !hasRequiredEnabledConfiguration(proposedConfig)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS requires credentials, sender details, and at least one supported market before it can be enabled")
    }

    const persisted = existing ? await this.updateGLSConfigs({ id: existing.id, ...encrypted }) : await this.createConfigProfile(environment, encrypted)
    await this.invalidateAllCaches()
    return decryptFields(mapGLSConfigDTO(persisted), [...GLS_SENSITIVE_FIELDS])
  }

  private async createConfigProfile(environment: GLSEnvironment, encrypted: Record<string, unknown>) {
    try {
      return await this.createGLSConfigs({ ...encrypted, environment })
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error
      }

      const concurrent = await this.getConfig(environment)
      if (!concurrent) {
        throw error
      }

      return this.updateGLSConfigs({ id: concurrent.id, ...encrypted })
    }
  }

  async activateConfig(environment: GLSEnvironment, confirmed: boolean): Promise<GLSConfigDTO> {
    return this.lockingService_.execute("gls:activate-config", async () => {
      const profiles = await this.listConfigProfiles()
      const target = profiles.find((profile) => profile.environment === environment)
      if (!target) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, `GLS ${environment} profile was not found`)
      }

      if (environment === "production") {
        if (!confirmed) {
          throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "Activating the GLS production profile requires explicit confirmation")
        }
        if (!hasRequiredEnabledConfiguration(target)) {
          throw new MedusaError(MedusaError.Types.INVALID_DATA, "Enable the GLS production profile and complete its account, market, and sender settings before activating it")
        }
      }

      const inactiveUpdates = profiles.filter((profile) => profile.id !== target.id && profile.is_active).map((profile) => ({ id: profile.id, is_active: false }))
      const updatedProfiles = await this.updateGLSConfigs([...inactiveUpdates, { id: target.id, is_active: true }])
      await this.invalidateAllCaches()
      const updatedTarget = updatedProfiles.find((profile) => profile.id === target.id)
      if (!updatedTarget) {
        throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "GLS active profile was not persisted")
      }

      return decryptFields(mapGLSConfigDTO(updatedTarget), [...GLS_SENSITIVE_FIELDS])
    })
  }

  /**
   * Effective config used by API calls. Returns null if disabled or missing
   * required MyGLS credentials/pickup-address fields.
   */
  async getEffectiveConfig(reference: GLSConfigReference = {}): Promise<GLSOptions | null> {
    const config = await this.resolveConfig(reference)
    if (!config) {
      return null
    }

    const cached = await this.getCachedConfig(config)
    if (cached !== undefined) {
      return cached
    }

    if (
      !(
        config.is_enabled &&
        config.username &&
        config.password &&
        isPositiveNumber(config.client_number) &&
        hasRequiredPickupAddress(config) &&
        config.supported_countries.length > 0
      )
    ) {
      await this.cacheDisabledConfig(config.id)
      return null
    }

    const options = this.toEffectiveOptions(config)
    await this.cacheEffectiveConfig(options)

    return options
  }

  private async resolveConfig(reference: GLSConfigReference): Promise<GLSConfigDTO | null> {
    if (reference.config_id) {
      const configs = await this.listGLSConfigs({ id: reference.config_id }, { take: 1 })
      const config = configs[0]
      if (!config) {
        return null
      }

      const decrypted = decryptFields(mapGLSConfigDTO(config), [...GLS_SENSITIVE_FIELDS])
      if (reference.environment && reference.environment !== decrypted.environment) {
        throw new MedusaError(MedusaError.Types.INVALID_DATA, "GLS configuration reference does not match its profile")
      }

      return decrypted
    }

    return this.getConfig(reference.environment ?? undefined)
  }

  private async getCachedConfig(config: GLSConfigDTO): Promise<GLSOptions | null | undefined> {
    if (!this.cacheService_) {
      return
    }
    const cached = (await this.cacheService_.get({
      key: await this.getConfigCacheKey(config.id),
    })) as unknown
    if (isDisabledConfigCacheEntry(cached)) {
      return null
    }
    if (isCachedGLSOptions(cached)) {
      if (!(config.is_enabled && config.password)) {
        await this.cacheDisabledConfig(config.id)
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
        "GLS: Missing MyGLS credentials"
      )
    }

    if (!hasRequiredPickupAddress(config)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Missing pickup address fields"
      )
    }

    return {
      config_id: config.id,
      username: config.username,
      password: config.password,
      client_number: config.client_number,
      environment: config.environment,
      country_code: toCountryCode(config.country_code),
      supported_countries: config.supported_countries,
      type_of_printer: toPrinterType(config.type_of_printer),
      print_position: toPrintPosition(config.print_position),
      hide_phone_number_on_labels: config.hide_phone_number_on_labels,
      sender_name: config.sender_name as string,
      sender_street: config.sender_street as string,
      sender_house_number: config.sender_house_number as string,
      sender_house_number_info: config.sender_house_number_info ?? undefined,
      sender_city: config.sender_city as string,
      sender_zip_code: config.sender_zip_code as string,
      sender_country: config.sender_country as string,
      sender_phone: config.sender_phone ?? undefined,
      sender_email: config.sender_email ?? undefined,
    }
  }

  private async cacheEffectiveConfig(options: GLSOptions): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: await this.getConfigCacheKey(options.config_id),
      data: toCachedOptions(options),
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  private async cacheDisabledConfig(configId: string): Promise<void> {
    if (!this.cacheService_) {
      return
    }
    await this.cacheService_.set({
      key: await this.getConfigCacheKey(configId),
      data: { disabled: true } satisfies DisabledConfigCacheEntry,
      ttl: CACHE_TTL.CONFIG,
      tags: [CACHE_TAGS.ALL],
    })
  }

  async invalidateConfigCache(configId: string): Promise<void> {
    this.client_ = null
    this.clientConfigFingerprint_ = null
    if (this.cacheService_) {
      await this.cacheService_.clear({ key: await this.getConfigCacheKey(configId) })
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

  private async getConfigCacheKey(configId: string): Promise<string> {
    return this.computeCacheKey("config", { config_id: configId })
  }

  private async getBranchesCacheKey(
    configId: string,
    countryCode: GLSCountryCode
  ): Promise<string> {
    return this.computeCacheKey("branches", {
      config_id: configId,
      country_code: countryCode,
    })
  }

  private async computeCacheKey(
    scope: string,
    parts: Record<string, unknown> = {}
  ): Promise<string> {
    if (!this.cacheService_) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS: Cache service is not available"
      )
    }

    return this.cacheService_.computeKey({
      module: "gls",
      scope,
      ...parts,
    })
  }

  private async getClient(reference: GLSConfigReference = {}): Promise<GLSClient> {
    const config = await this.getEffectiveConfig(reference)
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS is disabled or not configured. Enable it in Settings → GLS and fill MyGLS credentials plus pickup address."
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
    reference: GLSConfigReference = {}
  ): Promise<GLSCreatePacketResult> {
    const client = await this.getClient(reference)
    return client.createPacket(attributes)
  }

  async createOrRecoverPacket(
    input: GLSCreateOrRecoverPacketInput
  ): Promise<GLSCreatePacketResult & { attempt_id: string; operation_key: string }> {
    const lockKey = `gls:parcel:create:${input.operation_key}`
    const ownerId = randomUUID()
    await this.lockingService_.acquire(lockKey, { ownerId, expire: 300 })

    try {
      return await this.createOrRecoverPacketLocked(input)
    } finally {
      await this.lockingService_.release(lockKey, { ownerId })
    }
  }

  private async createOrRecoverPacketLocked(
    input: GLSCreateOrRecoverPacketInput
  ): Promise<GLSCreatePacketResult & { attempt_id: string; operation_key: string }> {
    const attempts = await this.listGLSFulfillmentAttempts(
      { operation_key: input.operation_key },
      { order: { generation: "DESC" }, take: 1 }
    )
    let attempt = attempts[0]

    if (!attempt) {
      attempt = await this.createFulfillmentAttempt(input, 1)
    } else if (this.requiresNextAttemptGeneration(attempt, input)) {
      attempt = await this.createFulfillmentAttempt(
        input,
        attempt.generation + 1
      )
    }

    if (attempt.status === "completed") {
      const adopted =
        attempt.fulfillment_id === input.fulfillment_id
          ? attempt
          : await this.updateGLSFulfillmentAttempts({
              id: attempt.id,
              fulfillment_id: input.fulfillment_id,
            })
      return this.toRecoveredPacketResult(adopted, input.operation_key)
    }

    const reference = { config_id: input.config_id, environment: input.environment }
    const client = await this.getClient(reference)
    const recovered = await client.findPacketByClientReference(attempt.client_reference, attempt.updated_at)

    if (recovered) {
      const completed = await this.completeFulfillmentAttempt(attempt.id, input.fulfillment_id, recovered)
      return { ...recovered, attempt_id: completed.id, operation_key: input.operation_key }
    }

    try {
      const created = await client.createPacket({ ...input.attributes, number: attempt.client_reference })
      const completed = await this.completeFulfillmentAttempt(attempt.id, input.fulfillment_id, created)
      return { ...created, attempt_id: completed.id, operation_key: input.operation_key }
    } catch (error) {
      await this.updateGLSFulfillmentAttempts({
        id: attempt.id,
        fulfillment_id: input.fulfillment_id,
        last_error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private requiresNextAttemptGeneration(
    attempt: {
      fulfillment_id: string | null
      status: string
    },
    input: GLSCreateOrRecoverPacketInput
  ): boolean {
    if (attempt.status === "cancelled") {
      return true
    }

    return (
      attempt.status === "completed" &&
      Boolean(attempt.fulfillment_id) &&
      attempt.fulfillment_id !== input.fulfillment_id &&
      input.active_fulfillment_ids.includes(attempt.fulfillment_id as string)
    )
  }

  private async createFulfillmentAttempt(
    input: GLSCreateOrRecoverPacketInput,
    generation: number
  ) {
    const clientReference =
      generation === 1
        ? input.client_reference
        : this.buildGeneratedClientReference(input.client_reference, generation)

    return this.createGLSFulfillmentAttempts({
      operation_key: input.operation_key,
      client_reference: clientReference,
      fulfillment_id: input.fulfillment_id,
      generation,
      status: "pending",
    })
  }

  private buildGeneratedClientReference(
    baseReference: string,
    generation: number
  ): string {
    const suffix = `-g${generation}`
    return baseReference.slice(0, Math.max(1, 40 - suffix.length)) + suffix
  }

  private async completeFulfillmentAttempt(
    attemptId: string,
    fulfillmentId: string,
    result: GLSCreatePacketResult
  ) {
    return this.updateGLSFulfillmentAttempts({
      id: attemptId,
      fulfillment_id: fulfillmentId,
      status: "completed",
      parcel_id: String(result.id),
      parcel_number: result.parcel_number,
      barcode: result.barcode,
      last_error: null
    })
  }

  private async toRecoveredPacketResult(
    attempt: {
      id: string
      parcel_id: string | null
      parcel_number: string | null
      barcode: string | null
    },
    operationKey: string
  ): Promise<GLSCreatePacketResult & { attempt_id: string; operation_key: string }> {
    if (!(attempt.parcel_id && attempt.parcel_number && attempt.barcode)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "GLS: Completed parcel attempt is missing carrier identifiers"
      )
    }

    return {
      id: attempt.parcel_id,
      parcel_number: attempt.parcel_number,
      barcode: attempt.barcode,
      barcodeText: attempt.barcode,
      attempt_id: attempt.id,
      operation_key: operationKey
    }
  }

  async cancelPacketForAttempt(attemptId: string, packetId: string | number, reference: GLSConfigReference = {}): Promise<boolean> {
    const cancelled = await this.cancelPacket(packetId, reference)
    if (!cancelled) {
      return false
    }

    await this.updateGLSFulfillmentAttempts({ id: attemptId, status: "cancelled" })
    return true
  }

  async cancelPacket(packetId: string | number, reference: GLSConfigReference = {}): Promise<boolean> {
    const client = await this.getClient(reference)
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
    reference: GLSConfigReference = {}
  ): Promise<GLSPacketStatusRecord[]> {
    const client = await this.getClient(reference)
    return client.packetStatus(parcelNumber)
  }

  async downloadLabelPdf(packetId: string | number, reference: GLSConfigReference = {}): Promise<Buffer> {
    const client = await this.getClient(reference)
    return client.downloadLabelPdf(packetId)
  }

  async downloadLabelsPdf(packetIds: (string | number)[], reference: GLSConfigReference = {}): Promise<Buffer> {
    const client = await this.getClient(reference)
    return client.downloadLabelsPdf(packetIds)
  }

  /** Pickup-point list from MyGLS MasterDataService, cached for 24h. */
  async getBranches(countryCode?: GLSCountryCode, reference: GLSConfigReference = {}): Promise<GLSBranch[]> {
    const config = await this.getEffectiveConfig(reference)
    if (!config) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS is disabled or not configured. Enable it in Settings → GLS and fill MyGLS credentials plus pickup address."
      )
    }
    const resolvedCountryCode = countryCode ?? config.country_code
    if (!config.supported_countries.includes(resolvedCountryCode)) {
      throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "GLS is not enabled for this storefront market")
    }

    const refreshKey = [config.config_id, resolvedCountryCode].join(":")

    if (this.cacheService_) {
      const cached = (await this.cacheService_.get({
        key: await this.getBranchesCacheKey(config.config_id, resolvedCountryCode),
      })) as unknown
      if (isGLSBranchArray(cached)) {
        return cached
      }
    }

    const existingRefresh = this.branchesRefresh_.get(refreshKey)
    if (existingRefresh) {
      return existingRefresh
    }

    const refresh = this.refreshBranches(config, resolvedCountryCode)
    this.branchesRefresh_.set(refreshKey, refresh)
    try {
      return await refresh
    } finally {
      this.branchesRefresh_.delete(refreshKey)
    }
  }

  async getBranch(
    countryCode: GLSCountryCode,
    branchId: string,
    reference: GLSConfigReference = {}
  ): Promise<GLSBranch | null> {
    const normalizedBranchId = branchId.trim()
    if (!normalizedBranchId) {
      return null
    }

    const branches = await this.getBranches(countryCode, reference)
    return branches.find((branch) => branch.id === normalizedBranchId) ?? null
  }

  private async refreshBranches(
    config: GLSOptions,
    countryCode: GLSCountryCode
  ): Promise<GLSBranch[]> {
    const client = await this.getClient({ config_id: config.config_id, environment: config.environment })
    const branches = await client.getBranchList(countryCode)

    if (this.cacheService_) {
      await this.cacheService_.set({
        key: await this.getBranchesCacheKey(config.config_id, countryCode),
        data: branches,
        ttl: CACHE_TTL.BRANCHES,
        tags: [CACHE_TAGS.ALL, CACHE_TAGS.BRANCHES],
      })
    }

    return branches
  }
}
