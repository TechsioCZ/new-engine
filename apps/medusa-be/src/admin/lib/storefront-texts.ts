import type { StorefrontTextCatalogEnvelope } from "../../modules/storefront-text/catalog"
import type {
  StorefrontTextMarket as RegistryStorefrontTextMarket,
  StorefrontTextNamespace as RegistryStorefrontTextNamespace,
  StorefrontTextStatus as RegistryStorefrontTextStatus,
} from "../../modules/storefront-text/configuration"
import { queryKeysFactory } from "./query-key-factory"
import { sdk } from "./sdk"

export interface StorefrontText {
  country: string
  created_at?: string
  default_value: string
  description?: null | string
  domain: string
  effective_value: string
  has_override: boolean
  id: string
  key: string
  locale: string
  market: string
  namespace: RegistryStorefrontTextNamespace
  override_value: null | string
  status: RegistryStorefrontTextStatus
  updated_at?: string
}

export interface StorefrontTextsResponse {
  count: number
  limit: number
  offset: number
  storefront_texts: StorefrontText[]
}

export interface StorefrontTextListParams {
  limit: number
  locale?: string
  market?: string
  namespace?: RegistryStorefrontTextNamespace
  offset: number
  q?: string
  search_scope?: StorefrontTextSearchScope
  status?: RegistryStorefrontTextStatus
}

export type StorefrontTextSearchScope = "all" | "value"

export interface StorefrontTextInput {
  override_value?: null | string
  status?: RegistryStorefrontTextStatus
}

export type StorefrontTextCatalogResponse = StorefrontTextCatalogEnvelope

export interface StorefrontTextCatalogImportInput {
  catalog: unknown
  market: RegistryStorefrontTextMarket
}

export interface StorefrontTextCatalogImportResponse {
  locale: string
  market: string
  result: {
    unchanged_count: number
    updated_count: number
  }
}

export interface StorefrontTextResponse {
  storefront_text: StorefrontText
}

export interface StorefrontTextSyncResponse {
  result: {
    created_count: number
    updated_count: number
  }
}

export const storefrontTextQueryKeys = queryKeysFactory<
  "storefront-texts",
  StorefrontTextListParams
>("storefront-texts")

export const listStorefrontTexts = async (params: StorefrontTextListParams) =>
  sdk.client.fetch<StorefrontTextsResponse>("/admin/storefront-texts", {
    query: {
      ...params,
      q: params.q || undefined,
    },
  })

export const updateStorefrontText = async (
  id: string,
  input: StorefrontTextInput,
) =>
  sdk.client.fetch<StorefrontTextResponse>(
    `/admin/storefront-texts/${id}/update`,
    {
      body: input,
      method: "POST",
    },
  )

export const syncStorefrontTexts = async () =>
  sdk.client.fetch<StorefrontTextSyncResponse>("/admin/storefront-texts/sync", {
    method: "POST",
  })

export const getStorefrontTextCatalog = async (
  market: RegistryStorefrontTextMarket,
) =>
  sdk.client.fetch<StorefrontTextCatalogResponse>(
    "/admin/storefront-texts/catalog",
    { query: { market } },
  )

export const importStorefrontTextCatalog = async (
  input: StorefrontTextCatalogImportInput,
) =>
  sdk.client.fetch<StorefrontTextCatalogImportResponse>(
    "/admin/storefront-texts/catalog",
    {
      body: input,
      method: "POST",
    },
  )
