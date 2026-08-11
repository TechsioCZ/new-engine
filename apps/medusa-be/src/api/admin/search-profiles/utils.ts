import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import {
  parseSearchProfileConfiguration,
  persistedSearchProfileToRuntime,
  type SearchProfile,
  SearchProfileConfigurationError,
  validateSearchProfileSet,
} from "../../../modules/meilisearch/profiles"
import {
  SEARCH_PROFILE_MODULE,
  type SearchProfileDTO,
  type SearchProfileModuleService,
  type SearchProfileWriteInput,
} from "../../../modules/search-profile"
import type { AdminSearchProfileInputSchemaType } from "./validators"

type MutableSearchProfileService = SearchProfileModuleService & {
  createSearchProfiles: (
    data: Record<string, unknown>
  ) => Promise<SearchProfileDTO>
  deleteSearchProfiles: (ids: string | string[]) => Promise<void>
  retrieveSearchProfile: (id: string) => Promise<SearchProfileDTO>
  updateSearchProfiles: (
    data: Record<string, unknown> | Record<string, unknown>[]
  ) => Promise<SearchProfileDTO | SearchProfileDTO[]>
  invalidateRuntimeProfileCache: () => Promise<void>
}

export const getSearchProfileService = (
  container: MedusaContainer
): MutableSearchProfileService =>
  container.resolve<MutableSearchProfileService>(SEARCH_PROFILE_MODULE)

export const toSearchProfileWriteInput = (
  input: AdminSearchProfileInputSchemaType
): SearchProfileWriteInput => ({
  ...input,
  sales_channel_ids: [...new Set(input.sales_channel_ids)],
})

const writeInputToRuntime = (
  input: SearchProfileWriteInput,
  id?: string
): SearchProfile => ({
  ...parseSearchProfileConfiguration({
    availability: input.availability,
    domain: input.domain,
    key: input.key,

    limits: {
      autocomplete: {
        product: input.autocomplete_product_limit,
        category: input.autocomplete_category_limit,
        brand: input.autocomplete_brand_limit,
        content: input.autocomplete_content_limit,
      },

      fullSearch: input.full_search_limit,
      page: input.max_results_per_page,
      popular: input.popular_limit,
    },

    locale: input.locale,
    minimumRankingScore: input.minimum_ranking_score ?? undefined,
    salesChannelIds: input.sales_channel_ids,
    separateVariantResults: input.separate_variant_results,
    shop: input.shop,
    strict: input.strict,
  }),

  id,
})

export const validateSalesChannelIds = async (query: Query, ids: string[]) => {
  const uniqueIds = [...new Set(ids)]

  if (!uniqueIds.length) {
    return
  }

  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { id: { $in: uniqueIds } },
  })
  const found = new Set(
    (data as { id?: string }[])
      .map((entry) => entry.id)
      .filter((id): id is string => Boolean(id))
  )
  const missing = uniqueIds.filter((id) => !found.has(id))

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown Sales Channel IDs: ${missing.join(", ")}`
    )
  }
}

export const validateProfileChange = async (options: {
  currentId?: string
  input: SearchProfileWriteInput
  service: SearchProfileModuleService
}) => {
  const records = await options.service.listConfiguredProfiles()

  const candidates = records
    .filter((profile) => profile.id !== options.currentId)
    .map((profile) => persistedSearchProfileToRuntime(profile))

  const candidate = writeInputToRuntime(options.input, options.currentId)

  const enabledProfiles = [
    ...candidates.filter((profile) => profile.salesChannelIds.length > 0),
    ...(options.input.sales_channel_ids.length > 0 ? [candidate] : []),
  ]

  try {
    validateSearchProfileSet(enabledProfiles)
  } catch (error) {
    if (error instanceof SearchProfileConfigurationError) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
    }

    throw error
  }
}

export const toSearchProfileResponse = (profile: SearchProfileDTO) => {
  const runtime = persistedSearchProfileToRuntime(profile)
  const salesChannelIds = Array.isArray(profile.sales_channel_ids)
    ? profile.sales_channel_ids
    : []

  return {
    ...profile,
    sales_channel_ids: salesChannelIds,
    effective_minimum_ranking_score: runtime.minimumRankingScore,
  }
}

export const retrieveSearchProfileOrThrow = async (
  service: SearchProfileModuleService,
  id: string
): Promise<SearchProfileDTO> => {
  try {
    return (await service.retrieveSearchProfile(
      id
    )) as unknown as SearchProfileDTO
  } catch {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Search profile ${id} was not found.`
    )
  }
}

export const updateStoredSearchProfile = async (
  service: MutableSearchProfileService,
  id: string,
  input: SearchProfileWriteInput
) => {
  const result = await service.updateSearchProfiles({ id, ...input })
  const updated = Array.isArray(result)
    ? result.find((profile) => profile.id === id)
    : result

  if (!updated) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Search profile update returned no result."
    )
  }

  return updated
}
