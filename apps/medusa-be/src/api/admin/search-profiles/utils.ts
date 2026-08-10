import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { z as zod } from "@medusajs/framework/zod"

import {
  parseSearchProfileConfiguration,
  isSearchProfileConfigurationError,
  persistedSearchProfileToRuntime,
  validateSearchProfileSet,
} from "../../../modules/meilisearch/profiles"
import type { SearchProfile } from "../../../modules/meilisearch/profiles"
import { SEARCH_PROFILE_MODULE } from "../../../modules/search-profile"
import type {
  SearchProfileDTO,
  SearchProfileModuleService,
  SearchProfileWriteInput,
} from "../../../modules/search-profile"
import type { AdminSearchProfileInputSchemaType } from "./validators"

const salesChannelRecordSchema = zod.object({ id: zod.string() })

export const getSearchProfileService = (
  container: MedusaContainer,
): SearchProfileModuleService =>
  container.resolve<SearchProfileModuleService>(SEARCH_PROFILE_MODULE)

export const toSearchProfileWriteInput = (
  input: AdminSearchProfileInputSchemaType,
): SearchProfileWriteInput => ({
  ...input,
  sales_channel_ids: [...new Set(input.sales_channel_ids)],
})

const writeInputToRuntime = (
  input: SearchProfileWriteInput,
  id?: string,
): SearchProfile => {
  const profile = parseSearchProfileConfiguration({
    availability: input.availability,
    domain: input.domain,
    key: input.key,
    limits: {
      autocomplete: {
        brand: input.autocomplete_brand_limit,
        category: input.autocomplete_category_limit,
        content: input.autocomplete_content_limit,
        product: input.autocomplete_product_limit,
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
  })

  return id === undefined ? profile : { ...profile, id }
}

export const validateSalesChannelIds = async (query: Query, ids: string[]) => {
  const uniqueIds = [...new Set(ids)]

  if (uniqueIds.length === 0) {
    return
  }

  const { data } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
    filters: { id: { $in: uniqueIds } },
  })
  const records = zod.array(salesChannelRecordSchema).parse(data)
  const found = new Set(records.map((entry) => entry.id))
  const missing = uniqueIds.filter((id) => !found.has(id))

  if (missing.length > 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown Sales Channel IDs: ${missing.join(", ")}`,
    )
  }
}

export const validateProfileChange = async (options: {
  currentId?: string
  input: SearchProfileWriteInput
  service: SearchProfileModuleService
}) => {
  const records = await options.service.listConfiguredProfiles()
  const enabledProfiles: SearchProfile[] = []

  for (const profile of records) {
    if (
      profile.id !== options.currentId &&
      profile.sales_channel_ids.length > 0
    ) {
      enabledProfiles.push(persistedSearchProfileToRuntime(profile))
    }
  }

  if (options.input.sales_channel_ids.length > 0) {
    enabledProfiles.push(writeInputToRuntime(options.input, options.currentId))
  }

  try {
    validateSearchProfileSet(enabledProfiles)
  } catch (error) {
    if (isSearchProfileConfigurationError(error)) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, error.message)
    }

    throw error
  }
}

export const toSearchProfileResponse = (profile: SearchProfileDTO) => {
  const runtime = persistedSearchProfileToRuntime(profile)

  return {
    ...profile,
    effective_minimum_ranking_score: runtime.minimumRankingScore,
  }
}

export const retrieveSearchProfileOrThrow = async (
  service: SearchProfileModuleService,
  id: string,
): Promise<SearchProfileDTO> => await service.retrieveConfiguredProfile(id)

export const updateStoredSearchProfile = async (
  service: SearchProfileModuleService,
  id: string,
  input: SearchProfileWriteInput,
): Promise<SearchProfileDTO> => await service.updateConfiguredProfile(id, input)
