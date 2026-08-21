import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { reconcileFourMarketSearchProfilesStep } from "../steps/reconcile-four-market-search-profiles"

export const bootstrapFourMarketSearchProfilesWorkflow = createWorkflow(
  "bootstrap-four-market-search-profiles",
  (input: Record<string, never>) => {
    const result = reconcileFourMarketSearchProfilesStep(input)
    return new WorkflowResponse(result)
  }
)
