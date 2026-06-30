import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteBrandAttributeTypesStep } from "../steps"
import type { DeleteBrandAttributeTypesWorkflowInput } from "../types"

export const deleteBrandAttributeTypesWorkflow = createWorkflow(
  "delete-brand-attribute-types-workflow",
  (input: DeleteBrandAttributeTypesWorkflowInput) =>
    new WorkflowResponse(deleteBrandAttributeTypesStep(input))
)
