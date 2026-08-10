import type { InferTypeOf } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"

import { decryptFields } from "../../utils/encryption"
import type ApiStore from "./models/api-store"
import { parseCredentials, SENSITIVE_FIELDS } from "./normalizers"
import type { ApiStoreAdminDTO, ApiStoreSecretDTO } from "./types"

export type ApiStoreRecord = InferTypeOf<typeof ApiStore>

const hasSecret = (value: string | null | undefined): boolean =>
  value !== null && value !== undefined && value !== ""

export const assertApiStoreHasSecret = (
  data: {
    api_key?: string | null
    credentials?: string | null
  },
  isInternal = false,
): void => {
  if (isInternal) {
    return
  }

  if (!(hasSecret(data.api_key) || hasSecret(data.credentials))) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Either api_key or credentials must be provided",
    )
  }
}

export const toApiStoreAdminDTO = (
  record: ApiStoreRecord,
): ApiStoreAdminDTO => ({
  access_token_expires_at: record.access_token_expires_at ?? null,
  api_url: record.api_url ?? null,
  created_at: record.created_at,
  enabled: record.enabled ?? true,
  has_api_key: record.api_key !== null && record.api_key !== "",
  has_credentials: record.credentials !== null && record.credentials !== "",
  id: record.id,
  is_internal: record.is_internal ?? false,
  name: record.name,
  updated_at: record.updated_at,
})

export const toApiStoreSecretDTO = (
  record: ApiStoreRecord,
): ApiStoreSecretDTO => {
  const decrypted = decryptFields(
    {
      api_key: record.api_key ?? null,
      credentials: record.credentials ?? null,
    },
    [...SENSITIVE_FIELDS],
  )

  return {
    ...toApiStoreAdminDTO(record),
    api_key: decrypted.api_key,
    credentials: parseCredentials(decrypted.credentials),
  }
}
