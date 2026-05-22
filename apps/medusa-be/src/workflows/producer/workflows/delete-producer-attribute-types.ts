import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteProducerAttributeTypesStep } from "../steps"
import type { DeleteProducerAttributeTypesWorkflowInput } from "../types"

export const deleteProducerAttributeTypesWorkflow = createWorkflow(
  "delete-producer-attribute-types-workflow",
  (input: DeleteProducerAttributeTypesWorkflowInput) =>
    new WorkflowResponse(deleteProducerAttributeTypesStep(input))
)
