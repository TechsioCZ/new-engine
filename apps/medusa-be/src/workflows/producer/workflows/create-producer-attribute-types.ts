import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createProducerAttributeTypesStep } from "../steps"
import type { CreateProducerAttributeTypesWorkflowInput } from "../types"

export const createProducerAttributeTypesWorkflow = createWorkflow(
  "create-producer-attribute-types-workflow",
  (input: CreateProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(createProducerAttributeTypesStep(input))
)
