import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  type SearchProfileSyncMode,
  type SearchProfileSyncOptions,
  synchronizeSearchProfiles,
} from "../../../modules/meilisearch/synchronize"

export type SynchronizeSearchProfilesStepInput = {
  mode: SearchProfileSyncMode
  options?: SearchProfileSyncOptions
}

export const synchronizeSearchProfilesStep = createStep(
  "synchronize-search-profiles",
  async (input: SynchronizeSearchProfilesStepInput, { container }) =>
    new StepResponse(
      await synchronizeSearchProfiles(container, input.mode, input.options)
    )
)
