import type { InferTypeOf } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { decryptFields } from "../../utils/encryption"
import type ApiStore from "./models/api-store"
import { parseCredentials, SENSITIVE_FIELDS } from "./normalizers"
import type { ApiStoreAdminDTO, ApiStoreSecretDTO } from "./types"

export type ApiStoreRecord = InferTypeOf<typeof ApiStore>

export function assertApiStoreHasSecret(
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

export function toApiStoreAdminDTO(record: ApiStoreRecord): ApiStoreAdminDTO {
  return {
    id: record.id,
    name: record.name,
    api_url: record.api_url ?? null,
    has_api_key: !!record.api_key,
    has_credentials: !!record.credentials,
    enabled: record.enabled ?? true,
    is_internal: record.is_internal ?? false,
    access_token_expires_at: record.access_token_expires_at ?? null,
    created_at: record.created_at,
    updated_at: record.updated_at,
  }
}

export function toApiStoreSecretDTO(record: ApiStoreRecord): ApiStoreSecretDTO {
  const decrypted = decryptFields(
    {
      api_key: record.api_key ?? null,
      credentials: record.credentials ?? null,
    },
    [...SENSITIVE_FIELDS]
  )

  return {
    ...toApiStoreAdminDTO(record),
    api_key: decrypted.api_key,
    credentials: parseCredentials(decrypted.credentials),
  }
}
