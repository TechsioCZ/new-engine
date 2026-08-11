import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  SEARCH_PROFILE_MODULE,
  type SearchProfileDTO,
  type SearchProfileModuleService,
  type SearchProfileWriteInput,
} from "../../modules/search-profile"

type MutableSearchProfileService = SearchProfileModuleService & {
  createSearchProfiles: (
    data: SearchProfileWriteInput
  ) => Promise<SearchProfileDTO>
  deleteSearchProfiles: (ids: string | string[]) => Promise<void>
  restoreSearchProfiles: (ids: string | string[]) => Promise<void>
  retrieveSearchProfile: (id: string) => Promise<SearchProfileDTO>
  updateSearchProfiles: (
    data: SearchProfileWriteInput & { id: string }
  ) => Promise<SearchProfileDTO | SearchProfileDTO[]>
  invalidateRuntimeProfileCache: () => Promise<void>
}

type UpdateSearchProfileInput = {
  id: string
  profile: SearchProfileWriteInput
}

type DeleteSearchProfileInput = {
  id: string
}

export const createSearchProfileStep = createStep(
  "create-search-profile",
  async (input: SearchProfileWriteInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )
    const created = await service.createSearchProfiles(input)

    return new StepResponse(created, created.id)
  },
  async (profileId, { container }) => {
    if (!profileId) {
      return
    }

    await container
      .resolve<MutableSearchProfileService>(SEARCH_PROFILE_MODULE)
      .deleteSearchProfiles(profileId)
  }
)

export const updateSearchProfileStep = createStep(
  "update-search-profile",
  async (input: UpdateSearchProfileInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )
    const previous = await service.retrieveSearchProfile(input.id)
    const previousSalesChannelIds = previous.sales_channel_ids

    if (
      !(
        Array.isArray(previousSalesChannelIds) &&
        previousSalesChannelIds.every(
          (salesChannelId): salesChannelId is string =>
            typeof salesChannelId === "string"
        )
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Search profile has invalid Sales Channel IDs."
      )
    }

    const previousAvailability = previous.availability

    if (previousAvailability !== "all" && previousAvailability !== "in-stock") {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Search profile has an invalid availability value."
      )
    }

    const previousProfile: SearchProfileWriteInput = {
      key: previous.key,
      shop: previous.shop,
      domain: previous.domain,
      locale: previous.locale,
      sales_channel_ids: previousSalesChannelIds,
      strict: previous.strict,
      separate_variant_results: previous.separate_variant_results,
      minimum_ranking_score: previous.minimum_ranking_score,
      availability: previousAvailability,
      autocomplete_product_limit: previous.autocomplete_product_limit,
      autocomplete_category_limit: previous.autocomplete_category_limit,
      autocomplete_brand_limit: previous.autocomplete_brand_limit,
      autocomplete_content_limit: previous.autocomplete_content_limit,
      full_search_limit: previous.full_search_limit,
      max_results_per_page: previous.max_results_per_page,
      popular_limit: previous.popular_limit,
    }
    const result = await service.updateSearchProfiles({
      id: input.id,
      ...input.profile,
    })
    const updated = Array.isArray(result)
      ? result.find((profile) => profile.id === input.id)
      : result

    if (!updated) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Search profile update returned no result."
      )
    }

    return new StepResponse(updated, {
      id: previous.id,
      profile: previousProfile,
    })
  },
  async (previous, { container }) => {
    if (!previous) {
      return
    }

    await container
      .resolve<MutableSearchProfileService>(SEARCH_PROFILE_MODULE)
      .updateSearchProfiles({ id: previous.id, ...previous.profile })
  }
)

export const deleteSearchProfileStep = createStep(
  "delete-search-profile",
  async (input: DeleteSearchProfileInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )

    await service.retrieveSearchProfile(input.id)
    await service.deleteSearchProfiles(input.id)

    return new StepResponse(
      {
        deleted: true,
        id: input.id,
        object: "search_profile" as const,
      },
      input.id
    )
  },
  async (profileId, { container }) => {
    if (!profileId) {
      return
    }

    await container
      .resolve<MutableSearchProfileService>(SEARCH_PROFILE_MODULE)
      .restoreSearchProfiles(profileId)
  }
)

export const invalidateSearchProfileRuntimeCacheStep = createStep(
  "invalidate-search-profile-runtime-cache",
  async (profileId: string, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )

    await service.invalidateRuntimeProfileCache()

    return new StepResponse({ invalidated: true, profile_id: profileId })
  }
)

export const createSearchProfileWorkflow = createWorkflow(
  "create-search-profile",
  (input: SearchProfileWriteInput) => {
    const created = createSearchProfileStep(input)

    invalidateSearchProfileRuntimeCacheStep(created.id)

    return new WorkflowResponse(created)
  }
)

export const updateSearchProfileWorkflow = createWorkflow(
  "update-search-profile",
  (input: UpdateSearchProfileInput) => {
    const updated = updateSearchProfileStep(input)

    invalidateSearchProfileRuntimeCacheStep(updated.id)

    return new WorkflowResponse(updated)
  }
)

export const deleteSearchProfileWorkflow = createWorkflow(
  "delete-search-profile",
  (input: DeleteSearchProfileInput) => {
    const deleted = deleteSearchProfileStep(input)

    invalidateSearchProfileRuntimeCacheStep(deleted.id)

    return new WorkflowResponse(deleted)
  }
)
