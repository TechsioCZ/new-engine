import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { syncStorefrontTextsStep } from "../steps/sync-storefront-texts"

export const syncStorefrontTextsWorkflow = createWorkflow(
  "sync-storefront-texts-workflow",
  () => new WorkflowResponse(syncStorefrontTextsStep())
)
