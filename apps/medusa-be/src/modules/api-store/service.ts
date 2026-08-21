import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import { encryptFields } from "../../utils/encryption"
import {
  assertApiStoreHasSecret,
  toApiStoreAdminDTO,
  toApiStoreSecretDTO,
} from "./helpers"
import ApiStore from "./models/api-store"
import {
  normalizeAccessTokenExpiresAt,
  normalizeApiUrl,
  normalizeName,
  SENSITIVE_FIELDS,
  serializeCredentials,
} from "./normalizers"
import type {
  ApiStoreAdminDTO,
  ApiStoreCreateInput,
  ApiStoreSecretDTO,
  ApiStoreUpdateInput,
} from "./types"

type ApiStoreWriteData = {
  id?: string
  name?: string
  api_url?: string | null
  api_key?: string | null
  credentials?: string | null
  enabled?: boolean
  is_internal?: boolean
  access_token_expires_at?: Date | null
}

const lockApiStoreName = async (
  name: string,
  sharedContext: Context<SqlEntityManager>
): Promise<void> => {
  const transactionManager = sharedContext.transactionManager
  if (!transactionManager) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "API store name lock requires an active transaction"
    )
  }

  await transactionManager.execute(
    "select pg_advisory_xact_lock(hashtextextended(?, 0))",
    [`api-store:${name}`]
  )
}

class ApiStoreModuleService extends MedusaService({
  ApiStore,
}) {
  @InjectManager()
  async listApiStoreConfigs(
    filters: { name?: string } = {},
    config: { take?: number; skip?: number } = {},
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<[ApiStoreAdminDTO[], number]> {
    const [records, count] = await this.listAndCountApiStores(
      { ...filters, is_internal: false },
      {
        take: config.take ?? 20,
        skip: config.skip ?? 0,
        order: { created_at: "DESC" },
      },
      sharedContext
    )

    return [records.map((record) => toApiStoreAdminDTO(record)), count]
  }

  @InjectManager()
  async retrieveApiStoreConfig(
    id: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    const record = await this.retrieveApiStore(id, {}, sharedContext)
    return toApiStoreAdminDTO(record)
  }

  @InjectManager()
  async retrieveApiStoreSecretsByName(
    name: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreSecretDTO | null> {
    const records = await this.listApiStores(
      { name: normalizeName(name) },
      { take: 1 },
      sharedContext
    )
    const record = records[0]

    if (!record) {
      return null
    }

    return toApiStoreSecretDTO(record)
  }

  @InjectManager()
  async retrieveApiStoreSecrets(
    id: string,
    @MedusaContext() sharedContext?: Context
  ): Promise<ApiStoreSecretDTO> {
    const record = await this.retrieveApiStore(id, {}, sharedContext)
    return toApiStoreSecretDTO(record)
  }

  @InjectManager()
  async createApiStoreConfig(
    input: ApiStoreCreateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    return await this.createApiStoreConfig_(input, sharedContext)
  }

  @InjectTransactionManager()
  private async createApiStoreConfig_(
    input: ApiStoreCreateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    const name = normalizeName(input.name)
    if (!name) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "Name is required")
    }

    await this.assertNameAvailable(name, undefined, sharedContext)

    const data: ApiStoreWriteData = {
      name,
      api_url: normalizeApiUrl(input.api_url) ?? null,
      api_key: input.api_key ?? null,
      credentials: serializeCredentials(input.credentials) ?? null,
      enabled: input.enabled ?? true,
      is_internal: input.is_internal ?? false,
      access_token_expires_at:
        normalizeAccessTokenExpiresAt(input.access_token_expires_at) ?? null,
    }

    assertApiStoreHasSecret(data, data.is_internal)

    const encrypted = encryptFields(data, [...SENSITIVE_FIELDS])
    const created = await this.createApiStores(encrypted, sharedContext)

    return toApiStoreAdminDTO(created)
  }

  @InjectManager()
  async updateApiStoreConfig(
    id: string,
    input: ApiStoreUpdateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    return await this.updateApiStoreConfig_(id, input, sharedContext)
  }

  @InjectTransactionManager()
  private async updateApiStoreConfig_(
    id: string,
    input: ApiStoreUpdateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    const existing = await this.retrieveApiStore(id, {}, sharedContext)
    const data: ApiStoreWriteData = { id }

    if (input.name !== undefined) {
      const name = normalizeName(input.name)
      if (!name) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Name is required"
        )
      }
      await this.assertNameAvailable(name, id, sharedContext)
      data.name = name
    }

    const apiUrl = normalizeApiUrl(input.api_url)
    if (apiUrl !== undefined) {
      data.api_url = apiUrl
    }

    if (input.api_key !== undefined) {
      data.api_key = input.api_key
    }

    if (input.enabled !== undefined) {
      data.enabled = input.enabled
    }

    if (input.is_internal !== undefined) {
      data.is_internal = input.is_internal
    }

    if (input.access_token_expires_at !== undefined) {
      data.access_token_expires_at = normalizeAccessTokenExpiresAt(
        input.access_token_expires_at
      )
    }

    const credentials = serializeCredentials(input.credentials)
    if (credentials !== undefined) {
      data.credentials = credentials
    }

    assertApiStoreHasSecret(
      {
        api_key: data.api_key === undefined ? existing.api_key : data.api_key,
        credentials:
          data.credentials === undefined
            ? existing.credentials
            : data.credentials,
      },
      data.is_internal === undefined ? existing.is_internal : data.is_internal
    )

    const encrypted = encryptFields(data, [...SENSITIVE_FIELDS])
    const updated = await this.updateApiStores(encrypted, sharedContext)

    return toApiStoreAdminDTO(updated)
  }

  @InjectManager()
  async deleteApiStoreConfig(
    id: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<{ id: string }> {
    return await this.deleteApiStoreConfig_(id, sharedContext)
  }

  @InjectTransactionManager()
  private async deleteApiStoreConfig_(
    id: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<{ id: string }> {
    await this.retrieveApiStore(id, {}, sharedContext)
    await this.deleteApiStores(id, sharedContext)

    return { id }
  }

  @InjectManager()
  async upsertApiStoreConfigByName(
    input: ApiStoreCreateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    return await this.upsertApiStoreConfigByName_(input, sharedContext)
  }

  @InjectTransactionManager()
  private async upsertApiStoreConfigByName_(
    input: ApiStoreCreateInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<ApiStoreAdminDTO> {
    const name = normalizeName(input.name)
    await lockApiStoreName(name, sharedContext)
    const existing = await this.retrieveApiStoreSecretsByName(
      name,
      sharedContext
    )

    if (!existing) {
      return this.createApiStoreConfig({ ...input, name }, sharedContext)
    }

    return this.updateApiStoreConfig(existing.id, input, sharedContext)
  }

  @InjectTransactionManager()
  private async assertNameAvailable(
    name: string,
    currentId?: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<void> {
    await lockApiStoreName(name, sharedContext)
    const existing = await this.listApiStores(
      { name },
      { take: 1 },
      sharedContext
    )
    const conflict = existing.find((record) => record.id !== currentId)

    if (conflict) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `API store config with name "${name}" already exists`
      )
    }
  }
}

export default ApiStoreModuleService
