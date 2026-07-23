export type ApiStoreCredentials = Record<string, unknown>

export type ApiStoreCreateInput = {
  name: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
}

export type ApiStoreUpdateInput = {
  name?: string
  api_url?: string | null
  api_key?: string | null
  credentials?: ApiStoreCredentials | null
}

export type ApiStoreAdminDTO = {
  id: string
  name: string
  api_url: string | null
  has_api_key: boolean
  has_credentials: boolean
  created_at?: Date | string
  updated_at?: Date | string
}

export type ApiStoreSecretDTO = ApiStoreAdminDTO & {
  api_key: string | null
  credentials: ApiStoreCredentials | null
}
