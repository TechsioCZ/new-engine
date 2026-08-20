import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
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

class ApiStoreModuleService extends MedusaService({
  ApiStore,
}) {
  async listApiStoreConfigs(
    filters: { name?: string } = {},
    config: { take?: number; skip?: number } = {},
    sharedContext?: Context
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

  async retrieveApiStoreConfig(
    id: string,
    sharedContext?: Context
  ): Promise<ApiStoreAdminDTO> {
    const record = await this.retrieveApiStore(id, {}, sharedContext)
    return toApiStoreAdminDTO(record)
  }

  async retrieveApiStoreSecretsByName(
    name: string,
    sharedContext?: Context
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

  async createApiStoreConfig(
    input: ApiStoreCreateInput,
    sharedContext?: Context
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

  async updateApiStoreConfig(
    id: string,
    input: ApiStoreUpdateInput,
    sharedContext?: Context
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

  async deleteApiStoreConfig(
    id: string,
    sharedContext?: Context
  ): Promise<{ id: string }> {
    await this.retrieveApiStore(id, {}, sharedContext)
    await this.deleteApiStores(id, sharedContext)

    return { id }
  }

  async upsertApiStoreConfigByName(
    input: ApiStoreCreateInput,
    sharedContext?: Context
  ): Promise<ApiStoreAdminDTO> {
    const name = normalizeName(input.name)
    const existing = await this.retrieveApiStoreSecretsByName(
      name,
      sharedContext
    )

    if (!existing) {
      return this.createApiStoreConfig({ ...input, name }, sharedContext)
    }

    return this.updateApiStoreConfig(existing.id, input, sharedContext)
  }

  private async assertNameAvailable(
    name: string,
    currentId?: string,
    sharedContext?: Context
  ): Promise<void> {
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
