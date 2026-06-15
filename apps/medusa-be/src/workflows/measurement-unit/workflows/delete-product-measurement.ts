import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteProductMeasurementStep } from "../steps"
import type { DeleteProductMeasurementWorkflowInput } from "../types"

export const deleteProductMeasurementWorkflow = createWorkflow(
  "delete-product-measurement-workflow",
  (input: DeleteProductMeasurementWorkflowInput) =>
    new WorkflowResponse(deleteProductMeasurementStep(input))
)
