import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  type SynchronizeSearchProfilesStepInput,
  synchronizeSearchProfilesStep,
} from "../steps/synchronize-search-profiles"

export const synchronizeSearchProfilesWorkflow = createWorkflow(
  "synchronize-search-profiles",
  (input: SynchronizeSearchProfilesStepInput) =>
    new WorkflowResponse(synchronizeSearchProfilesStep(input))
)
