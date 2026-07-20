import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setProductVariantMeasurementStep } from "../steps/set-product-variant-measurement"
import type { SetProductVariantMeasurementWorkflowInput } from "../types"

export const setProductVariantMeasurementWorkflow = createWorkflow(
  "set-product-variant-measurement-workflow",
  (input: SetProductVariantMeasurementWorkflowInput) =>
    new WorkflowResponse(setProductVariantMeasurementStep(input))
)
