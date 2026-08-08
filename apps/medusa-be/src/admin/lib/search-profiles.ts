import { sdk as medusaClient } from "./sdk"

export const SEARCH_INDEX_TYPES = [
  "product",
  "category",
  "brand",
  "content",
] as const
export type SearchIndexType = (typeof SEARCH_INDEX_TYPES)[number]

export const SEARCH_SYNC_STATUSES = [
  "never",
  "running",
  "succeeded",
  "failed",
] as const
export type SearchSyncStatus = (typeof SEARCH_SYNC_STATUSES)[number]
export type SearchSyncMode = "normal" | "full"

export interface SearchProfile {
  autocomplete_brand_limit: number
  autocomplete_category_limit: number
  autocomplete_content_limit: number
  autocomplete_product_limit: number
  availability: "all" | "in-stock"
  created_at: string
  domain: string
  effective_minimum_ranking_score: number
  full_search_limit: number
  id: string
  key: string
  last_deleted_count: number
  last_indexed_count: number
  last_sync_error: string | null
  last_sync_mode: SearchSyncMode | null
  last_sync_started_at: string | null
  last_sync_status: SearchSyncStatus
  last_synced_at: string | null
  locale: string
  max_results_per_page: number
  minimum_ranking_score: number | null
  popular_limit: number
  sales_channel_ids: string[]
  separate_variant_results: boolean
  shop: string
  strict: boolean
  updated_at: string
}

export interface SearchProfileInput {
  autocomplete_brand_limit: number
  autocomplete_category_limit: number
  autocomplete_content_limit: number
  autocomplete_product_limit: number
  availability: "all" | "in-stock"
  domain: string
  full_search_limit: number
  key: string
  locale: string
  max_results_per_page: number
  minimum_ranking_score: number | null
  popular_limit: number
  sales_channel_ids: string[]
  separate_variant_results: boolean
  shop: string
  strict: boolean
}

export interface SalesChannelOption {
  id: string
  name: string
}

export interface SearchTestResult {
  hits: Record<string, unknown>[]
  minimum_ranking_score: number | null
  processing_time_ms: number | null
  profile: string
  query: string
  raw_hit_count: number
  type: SearchIndexType
}

export interface SearchTestInput {
  limit: number
  query: string
  type: SearchIndexType
}

export interface VectorStatus {
  dimensions?: number
  embeddingFields?: string[]
  enabled: boolean
  model?: string
  provider?: string
}

export interface MeilisearchStatus {
  connected: boolean
  enabled: boolean
  error?: string
  status: string
}

const SEARCH_PROFILES_PATH = "/admin/search-profiles"
const SEARCH_PROFILES_QUERY_ROOT = "search-profiles"

export const searchProfileQueryKeys = {
  all: [SEARCH_PROFILES_QUERY_ROOT] as const,
  list: () => [SEARCH_PROFILES_QUERY_ROOT, "list"] as const,
  salesChannels: () => [SEARCH_PROFILES_QUERY_ROOT, "sales-channels"] as const,
  status: () => [SEARCH_PROFILES_QUERY_ROOT, "status"] as const,
  vectorStatus: () => [SEARCH_PROFILES_QUERY_ROOT, "vector-status"] as const,
}

export const listSearchProfiles = async (): Promise<SearchProfile[]> => {
  const response = await medusaClient.client.fetch<{
    profiles: SearchProfile[]
  }>(SEARCH_PROFILES_PATH)
  return response.profiles
}

export const listSalesChannels = async (): Promise<SalesChannelOption[]> => {
  const response = await medusaClient.client.fetch<{
    sales_channels: SalesChannelOption[]
  }>("/admin/sales-channels", { query: { fields: "id,name", limit: 100 } })
  return response.sales_channels
}

export const createSearchProfile = async (
  input: SearchProfileInput,
): Promise<SearchProfile> => {
  const response = await medusaClient.client.fetch<{ profile: SearchProfile }>(
    SEARCH_PROFILES_PATH,
    { body: input, method: "POST" },
  )
  return response.profile
}

export const updateSearchProfile = async (
  id: string,
  input: SearchProfileInput,
): Promise<SearchProfile> => {
  const response = await medusaClient.client.fetch<{ profile: SearchProfile }>(
    `${SEARCH_PROFILES_PATH}/${id}`,
    { body: input, method: "POST" },
  )
  return response.profile
}

export const deleteSearchProfile = async (id: string): Promise<void> => {
  await medusaClient.client.fetch(`${SEARCH_PROFILES_PATH}/${id}`, {
    method: "DELETE",
  })
}

export const synchronizeSearchProfiles = async (
  mode: SearchSyncMode,
  id?: string,
) => {
  const path =
    id !== undefined && id !== ""
      ? `${SEARCH_PROFILES_PATH}/${id}/sync`
      : `${SEARCH_PROFILES_PATH}/sync`

  return await medusaClient.client.fetch<{
    result: {
      deleted: number
      indexed: number
      mode: SearchSyncMode
      profiles: number
      status: "completed" | "skipped_disabled" | "skipped_lock_contended"
    }
  }>(path, { body: { mode }, method: "POST" })
}

export const testSearchProfile = async (
  id: string,
  input: SearchTestInput,
): Promise<SearchTestResult> => {
  const result = await medusaClient.client.fetch<SearchTestResult>(
    `${SEARCH_PROFILES_PATH}/${id}/test`,
    { body: input, method: "POST" },
  )
  return result
}

export const getVectorStatus = async (): Promise<VectorStatus> => {
  const status = await medusaClient.client.fetch<VectorStatus>(
    "/admin/meilisearch/vector-status",
  )
  return status
}

export const getMeilisearchStatus = async (): Promise<MeilisearchStatus> => {
  const status = await medusaClient.client.fetch<MeilisearchStatus>(
    `${SEARCH_PROFILES_PATH}/status`,
  )
  return status
}

const DEFAULT_SEARCH_PROFILE_INPUT: SearchProfileInput = {
  autocomplete_brand_limit: 3,
  autocomplete_category_limit: 3,
  autocomplete_content_limit: 3,
  autocomplete_product_limit: 6,
  availability: "all",
  domain: "",
  full_search_limit: 500,
  key: "",
  locale: "",
  max_results_per_page: 100,
  minimum_ranking_score: null,
  popular_limit: 12,
  sales_channel_ids: [],
  separate_variant_results: false,
  shop: "",
  strict: false,
}

export const toSearchProfileInput = (
  profile?: SearchProfile,
): SearchProfileInput => {
  if (profile === undefined) {
    return { ...DEFAULT_SEARCH_PROFILE_INPUT }
  }

  return {
    autocomplete_brand_limit: profile.autocomplete_brand_limit,
    autocomplete_category_limit: profile.autocomplete_category_limit,
    autocomplete_content_limit: profile.autocomplete_content_limit,
    autocomplete_product_limit: profile.autocomplete_product_limit,
    availability: profile.availability,
    domain: profile.domain,
    full_search_limit: profile.full_search_limit,
    key: profile.key,
    locale: profile.locale,
    max_results_per_page: profile.max_results_per_page,
    minimum_ranking_score: profile.minimum_ranking_score,
    popular_limit: profile.popular_limit,
    sales_channel_ids: profile.sales_channel_ids,
    separate_variant_results: profile.separate_variant_results,
    shop: profile.shop,
    strict: profile.strict,
  }
}
