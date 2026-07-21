import type {
  StorefrontTextMarket as RegistryStorefrontTextMarket,
  StorefrontTextNamespace as RegistryStorefrontTextNamespace,
  StorefrontTextStatus as RegistryStorefrontTextStatus,
} from "../../modules/storefront-text/configuration"
import type { StorefrontTextCatalogEnvelope } from "../../modules/storefront-text/catalog"
import { queryKeysFactory } from "./query-key-factory"
import { sdk } from "./sdk"

export type StorefrontText = {
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

export type StorefrontTextsResponse = {
  count: number
  limit: number
  offset: number
  storefront_texts: StorefrontText[]
}

export type StorefrontTextListParams = {
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

export type StorefrontTextInput = {
  override_value?: null | string
  status?: RegistryStorefrontTextStatus
}

export type StorefrontTextCatalogResponse = StorefrontTextCatalogEnvelope

export type StorefrontTextCatalogImportInput = {
  catalog: unknown
  market: RegistryStorefrontTextMarket
}

export type StorefrontTextCatalogImportResponse = {
  locale: string
  market: string
  result: {
    unchanged_count: number
    updated_count: number
  }
}

export type StorefrontTextResponse = {
  storefront_text: StorefrontText
}

export type StorefrontTextSyncResponse = {
  result: {
    created_count: number
    updated_count: number
  }
}

export const storefrontTextQueryKeys = queryKeysFactory<
  "storefront-texts",
  StorefrontTextListParams
>("storefront-texts")

export const listStorefrontTexts = (params: StorefrontTextListParams) =>
  sdk.client.fetch<StorefrontTextsResponse>("/admin/storefront-texts", {
    query: {
      ...params,
      q: params.q || undefined,
    },
  })

export const updateStorefrontText = (id: string, input: StorefrontTextInput) =>
  sdk.client.fetch<StorefrontTextResponse>(
    `/admin/storefront-texts/${id}/update`,
    {
      body: input,
      method: "POST",
    }
  )

export const syncStorefrontTexts = () =>
  sdk.client.fetch<StorefrontTextSyncResponse>("/admin/storefront-texts/sync", {
    method: "POST",
  })

export const getStorefrontTextCatalog = (
  market: RegistryStorefrontTextMarket
) =>
  sdk.client.fetch<StorefrontTextCatalogResponse>(
    "/admin/storefront-texts/catalog",
    { query: { market } }
  )

export const importStorefrontTextCatalog = (
  input: StorefrontTextCatalogImportInput
) =>
  sdk.client.fetch<StorefrontTextCatalogImportResponse>(
    "/admin/storefront-texts/catalog",
    {
      body: input,
      method: "POST",
    }
  )
