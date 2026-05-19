import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { restoreProducerAttributeTypesStep } from "../steps"
import type { RestoreProducerAttributeTypesWorkflowInput } from "../types"

export const restoreProducerAttributeTypesWorkflow = createWorkflow(
  "restore-producer-attribute-types-workflow",
  (input: RestoreProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(restoreProducerAttributeTypesStep(input))
)
