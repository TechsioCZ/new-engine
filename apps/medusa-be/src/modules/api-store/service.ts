import type { Context, InferTypeOf } from "@medusajs/framework/types"
import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { decryptFields, encryptFields } from "../../utils/encryption"
import ApiStore from "./models/api-store"
import type {
  ApiStoreAdminDTO,
  ApiStoreCreateInput,
  ApiStoreCredentials,
  ApiStoreSecretDTO,
  ApiStoreUpdateInput,
} from "./types"

type ApiStoreRecord = InferTypeOf<typeof ApiStore>

type ApiStoreWriteData = {
  id?: string
  name?: string
  api_url?: string | null
  api_key?: string | null
  credentials?: string | null
  is_internal?: boolean
  access_token_expires_at?: Date | null
}

const SENSITIVE_FIELDS = ["api_key", "credentials"] as const

const normalizeName = (name: string): string => name.trim()

const normalizeAccessTokenExpiresAt = (
  value?: Date | string | null
): Date | null | undefined => {
  if (value === undefined) {
    return
  }

  if (value === null || value instanceof Date) {
    return value
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeApiUrl = (apiUrl?: string | null): string | null | undefined => {
  if (apiUrl === undefined) {
    return
  }

  const trimmed = apiUrl?.trim()
  return trimmed ? trimmed : null
}

const serializeCredentials = (
  credentials: ApiStoreCredentials | null | undefined
): string | null | undefined => {
  if (credentials === undefined) {
    return
  }

  return credentials === null ? null : JSON.stringify(credentials)
}

const parseCredentials = (
  credentials: string | null
): ApiStoreCredentials | null => {
  if (!credentials) {
    return null
  }

  return JSON.parse(credentials) as ApiStoreCredentials
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

    return [records.map((record) => this.toAdminDTO(record)), count]
  }

  async retrieveApiStoreConfig(
    id: string,
    sharedContext?: Context
  ): Promise<ApiStoreAdminDTO> {
    const record = await this.retrieveApiStore(id, {}, sharedContext)
    return this.toAdminDTO(record)
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

    return this.toSecretDTO(record)
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
      is_internal: input.is_internal ?? false,
      access_token_expires_at:
        normalizeAccessTokenExpiresAt(input.access_token_expires_at) ?? null,
    }

    this.assertHasSecret(data, data.is_internal)

    const encrypted = encryptFields(data, [...SENSITIVE_FIELDS])
    const created = await this.createApiStores(encrypted, sharedContext)

    return this.toAdminDTO(created)
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

    this.assertHasSecret(
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

    return this.toAdminDTO(updated)
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

  private assertHasSecret(
    data: {
      api_key?: string | null
      credentials?: string | null
    },
    isInternal = false
  ): void {
    if (isInternal) {
      return
    }

    if (!(data.api_key || data.credentials)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Either api_key or credentials must be provided"
      )
    }
  }

  private toAdminDTO(record: ApiStoreRecord): ApiStoreAdminDTO {
    return {
      id: record.id,
      name: record.name,
      api_url: record.api_url ?? null,
      has_api_key: !!record.api_key,
      has_credentials: !!record.credentials,
      is_internal: record.is_internal ?? false,
      access_token_expires_at: record.access_token_expires_at ?? null,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  }

  private toSecretDTO(record: ApiStoreRecord): ApiStoreSecretDTO {
    const decrypted = decryptFields(
      {
        api_key: record.api_key ?? null,
        credentials: record.credentials ?? null,
      },
      [...SENSITIVE_FIELDS]
    )

    return {
      ...this.toAdminDTO(record),
      api_key: decrypted.api_key,
      credentials: parseCredentials(decrypted.credentials),
    }
  }
}

export default ApiStoreModuleService
