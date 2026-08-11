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

const createSearchProfileStep = createStep(
  "create-search-profile",
  async (input: SearchProfileWriteInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )
    const created = await service.createSearchProfiles(input)

    await service.invalidateRuntimeProfileCache()

    return new StepResponse(created)
  }
)

const updateSearchProfileStep = createStep(
  "update-search-profile",
  async (input: UpdateSearchProfileInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )
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

    await service.invalidateRuntimeProfileCache()

    return new StepResponse(updated)
  }
)

const deleteSearchProfileStep = createStep(
  "delete-search-profile",
  async (input: DeleteSearchProfileInput, { container }) => {
    const service = container.resolve<MutableSearchProfileService>(
      SEARCH_PROFILE_MODULE
    )

    await service.deleteSearchProfiles(input.id)
    await service.invalidateRuntimeProfileCache()

    return new StepResponse({
      deleted: true,
      id: input.id,
      object: "search_profile" as const,
    })
  }
)

export const createSearchProfileWorkflow = createWorkflow(
  "create-search-profile",
  (input: SearchProfileWriteInput) =>
    new WorkflowResponse(createSearchProfileStep(input))
)

export const updateSearchProfileWorkflow = createWorkflow(
  "update-search-profile",
  (input: UpdateSearchProfileInput) =>
    new WorkflowResponse(updateSearchProfileStep(input))
)

export const deleteSearchProfileWorkflow = createWorkflow(
  "delete-search-profile",
  (input: DeleteSearchProfileInput) =>
    new WorkflowResponse(deleteSearchProfileStep(input))
)
