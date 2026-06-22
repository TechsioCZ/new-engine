import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createBrandAttributeTypesStep } from "../steps"
import type { CreateBrandAttributeTypesWorkflowInput } from "../types"

export const createBrandAttributeTypesWorkflow = createWorkflow(
  "create-brand-attribute-types-workflow",
  (input: CreateBrandAttributeTypesWorkflowInput) =>
    new WorkflowResponse(createBrandAttributeTypesStep(input))
)
