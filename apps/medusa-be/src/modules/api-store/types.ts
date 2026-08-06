export type ApiStoreCredentials = Record<string, unknown>

export type ApiStoreCreateInput = {
  name: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
  is_internal?: boolean
  access_token_expires_at?: Date | string | null
}

export type ApiStoreUpdateInput = {
  name?: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
  is_internal?: boolean
  access_token_expires_at?: Date | string | null
}

export type ApiStoreAdminDTO = {
  id: string
  name: string
  api_url: string | null
  has_api_key: boolean
  has_credentials: boolean
  is_internal: boolean
  access_token_expires_at: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

export type ApiStoreSecretDTO = ApiStoreAdminDTO & {
  api_key: string | null
  credentials: ApiStoreCredentials | null
}
