import { sdk as medusaClient } from "./sdk"

export type SearchIndexType = "product" | "category" | "brand" | "content"
export type SearchSyncMode = "normal" | "full"

export type SearchProfile = {
  id: string
  key: string
  shop: string
  domain: string
  locale: string
  sales_channel_ids: string[]
  strict: boolean
  separate_variant_results: boolean
  minimum_ranking_score: number | null
  effective_minimum_ranking_score: number
  availability: "all" | "in-stock"
  autocomplete_product_limit: number
  autocomplete_category_limit: number
  autocomplete_brand_limit: number
  autocomplete_content_limit: number
  full_search_limit: number
  max_results_per_page: number
  popular_limit: number
  last_sync_status: "never" | "running" | "succeeded" | "failed"
  last_sync_mode: SearchSyncMode | null
  last_sync_started_at: string | null
  last_synced_at: string | null
  last_sync_error: string | null
  last_indexed_count: number
  last_deleted_count: number
  created_at: string
  updated_at: string
}

export type SearchProfileInput = {
  key: string
  shop: string
  domain: string
  locale: string
  sales_channel_ids: string[]
  strict: boolean
  separate_variant_results: boolean
  minimum_ranking_score: number | null
  availability: "all" | "in-stock"
  autocomplete_product_limit: number
  autocomplete_category_limit: number
  autocomplete_brand_limit: number
  autocomplete_content_limit: number
  full_search_limit: number
  max_results_per_page: number
  popular_limit: number
}

export type SalesChannelOption = {
  id: string
  name: string
}

export type SearchTestResult = {
  profile: string
  type: SearchIndexType
  query: string
  minimum_ranking_score: number | null
  hits: Record<string, unknown>[]
  raw_hit_count: number
  processing_time_ms: number | null
}

export type SearchTestInput = {
  query: string
  type: SearchIndexType
  limit: number
}

export type VectorStatus = {
  enabled: boolean
  provider?: string
  model?: string
  dimensions?: number
  embeddingFields?: string[]
}

export type MeilisearchStatus = {
  enabled: boolean
  connected: boolean
  status: string
  error?: string
}

export const searchProfileQueryKeys = {
  all: ["search-profiles"] as const,
  list: () => ["search-profiles", "list"] as const,
  salesChannels: () => ["search-profiles", "sales-channels"] as const,
  vectorStatus: () => ["search-profiles", "vector-status"] as const,
  status: () => ["search-profiles", "status"] as const,
}

export const listSearchProfiles = async (): Promise<SearchProfile[]> => {
  const response = await medusaClient.client.fetch<{
    profiles: SearchProfile[]
  }>("/admin/search-profiles")

  return response.profiles
}

export const listSalesChannels = async (): Promise<SalesChannelOption[]> => {
  const response = await medusaClient.client.fetch<{
    sales_channels: SalesChannelOption[]
  }>("/admin/sales-channels", { query: { fields: "id,name", limit: 100 } })

  return response.sales_channels
}

export const createSearchProfile = async (
  input: SearchProfileInput
): Promise<SearchProfile> => {
  const response = await medusaClient.client.fetch<{ profile: SearchProfile }>(
    "/admin/search-profiles",
    { method: "POST", body: input }
  )

  return response.profile
}

export const updateSearchProfile = async (
  id: string,
  input: SearchProfileInput
): Promise<SearchProfile> => {
  const response = await medusaClient.client.fetch<{ profile: SearchProfile }>(
    `/admin/search-profiles/${id}`,
    { method: "POST", body: input }
  )

  return response.profile
}

export const deleteSearchProfile = async (id: string): Promise<void> => {
  await medusaClient.client.fetch(`/admin/search-profiles/${id}`, {
    method: "DELETE",
  })
}

export const synchronizeSearchProfiles = async (
  mode: SearchSyncMode,
  id?: string
) =>
  medusaClient.client.fetch<{
    result: {
      deleted: number
      indexed: number
      mode: SearchSyncMode
      profiles: number
    }
  }>(id ? `/admin/search-profiles/${id}/sync` : "/admin/search-profiles/sync", {
    method: "POST",
    body: { mode },
  })

export const testSearchProfile = async (
  id: string,
  input: SearchTestInput
): Promise<SearchTestResult> =>
  medusaClient.client.fetch<SearchTestResult>(
    `/admin/search-profiles/${id}/test`,
    { method: "POST", body: input }
  )

export const getVectorStatus = async (): Promise<VectorStatus> =>
  medusaClient.client.fetch("/admin/meilisearch/vector-status")

export const getMeilisearchStatus = async (): Promise<MeilisearchStatus> =>
  medusaClient.client.fetch("/admin/search-profiles/status")

const DEFAULT_SEARCH_PROFILE_INPUT: SearchProfileInput = {
  key: "",
  shop: "",
  domain: "",
  locale: "",
  sales_channel_ids: [],
  strict: false,
  separate_variant_results: false,
  minimum_ranking_score: null,
  availability: "all",
  autocomplete_product_limit: 6,
  autocomplete_category_limit: 3,
  autocomplete_brand_limit: 3,
  autocomplete_content_limit: 3,
  full_search_limit: 500,
  max_results_per_page: 100,
  popular_limit: 12,
}

export const toSearchProfileInput = (
  profile?: SearchProfile
): SearchProfileInput => {
  if (!profile) {
    return { ...DEFAULT_SEARCH_PROFILE_INPUT }
  }

  return {
    key: profile.key,
    shop: profile.shop,
    domain: profile.domain,
    locale: profile.locale,
    sales_channel_ids: profile.sales_channel_ids,
    strict: profile.strict,
    separate_variant_results: profile.separate_variant_results,
    minimum_ranking_score: profile.minimum_ranking_score,
    availability: profile.availability,
    autocomplete_product_limit: profile.autocomplete_product_limit,
    autocomplete_category_limit: profile.autocomplete_category_limit,
    autocomplete_brand_limit: profile.autocomplete_brand_limit,
    autocomplete_content_limit: profile.autocomplete_content_limit,
    full_search_limit: profile.full_search_limit,
    max_results_per_page: profile.max_results_per_page,
    popular_limit: profile.popular_limit,
  }
}
