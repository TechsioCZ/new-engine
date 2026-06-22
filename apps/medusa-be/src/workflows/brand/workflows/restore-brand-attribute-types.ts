import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { restoreBrandAttributeTypesStep } from "../steps"
import type { RestoreBrandAttributeTypesWorkflowInput } from "../types"

export const restoreBrandAttributeTypesWorkflow = createWorkflow(
  "restore-brand-attribute-types-workflow",
  (input: RestoreBrandAttributeTypesWorkflowInput) =>
    new WorkflowResponse(restoreBrandAttributeTypesStep(input))
)
