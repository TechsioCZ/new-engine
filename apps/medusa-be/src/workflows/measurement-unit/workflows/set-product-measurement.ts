import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { setProductMeasurementStep } from "../steps"
import type { SetProductMeasurementWorkflowInput } from "../types"

export const setProductMeasurementWorkflow = createWorkflow(
  "set-product-measurement-workflow",
  (input: SetProductMeasurementWorkflowInput) =>
    new WorkflowResponse(setProductMeasurementStep(input))
)
