import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateMeasurementUnitStep } from "../steps"
import type { UpdateMeasurementUnitWorkflowInput } from "../types"

export const updateMeasurementUnitWorkflow = createWorkflow(
  "update-measurement-unit-workflow",
  (input: UpdateMeasurementUnitWorkflowInput) =>
    new WorkflowResponse(updateMeasurementUnitStep(input))
)
