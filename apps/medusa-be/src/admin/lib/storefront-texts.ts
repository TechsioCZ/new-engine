import type {
  StorefrontTextNamespace as RegistryStorefrontTextNamespace,
  StorefrontTextStatus as RegistryStorefrontTextStatus,
} from "../../modules/storefront-text/registry"
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

export type StorefrontTextResponse = {
  storefront_text: StorefrontText
}

export type StorefrontTextSyncResponse = {
  result: {
    created_count: number
    updated_count: number
  }
}

const toSearch = (params: Record<string, number | string | undefined>) => {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value))
    }
  }

  return search.toString()
}

export const storefrontTextQueryKeys = {
  list: (params: StorefrontTextListParams) =>
    ["storefront-texts", params] as const,
  lists: () => ["storefront-texts"] as const,
}

export const listStorefrontTexts = (params: StorefrontTextListParams) =>
  sdk.client.fetch<StorefrontTextsResponse>(
    `/admin/storefront-texts?${toSearch(params)}`
  )

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
