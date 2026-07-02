import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteProductVariantMeasurementStep } from "../steps/delete-product-variant-measurement"
import type { DeleteProductVariantMeasurementWorkflowInput } from "../types"

export const deleteProductVariantMeasurementWorkflow = createWorkflow(
  "delete-product-variant-measurement-workflow",
  (input: DeleteProductVariantMeasurementWorkflowInput) =>
    new WorkflowResponse(deleteProductVariantMeasurementStep(input))
)
