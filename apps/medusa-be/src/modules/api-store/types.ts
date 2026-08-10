import { z } from "@medusajs/framework/zod"

/**
 * Provider-owned credential objects may use arbitrary keys, but every value
 * must be recursively JSON-serializable before it crosses this boundary.
 */
export const ApiStoreCredentialsSchema = z.record(z.string(), z.json())

export type ApiStoreCredentials = z.infer<typeof ApiStoreCredentialsSchema>
export type ApiStoreAccessTokenExpiresAt = Date | string | null

export interface ApiStoreCreateInput {
  name: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
  enabled?: boolean
  is_internal?: boolean
  access_token_expires_at?: ApiStoreAccessTokenExpiresAt
}

export interface ApiStoreUpdateInput {
  name?: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
  enabled?: boolean
  is_internal?: boolean
  access_token_expires_at?: ApiStoreAccessTokenExpiresAt
}

export interface ApiStoreAdminDTO {
  id: string
  name: string
  api_url: string | null
  has_api_key: boolean
  has_credentials: boolean
  enabled: boolean
  is_internal: boolean
  access_token_expires_at: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

export type ApiStoreSecretDTO = ApiStoreAdminDTO & {
  api_key: string | null
  credentials: ApiStoreCredentials | null
}
