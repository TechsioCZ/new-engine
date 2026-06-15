import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteMeasurementUnitsStep } from "../steps"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"

export const deleteMeasurementUnitsWorkflow = createWorkflow(
  "delete-measurement-units-workflow",
  (input: DeleteMeasurementUnitsWorkflowInput) =>
    new WorkflowResponse(deleteMeasurementUnitsStep(input))
)
