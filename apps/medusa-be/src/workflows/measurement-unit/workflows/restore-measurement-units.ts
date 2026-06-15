import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { restoreMeasurementUnitsStep } from "../steps"
import type { RestoreMeasurementUnitsWorkflowInput } from "../types"

export const restoreMeasurementUnitsWorkflow = createWorkflow(
  "restore-measurement-units-workflow",
  (input: RestoreMeasurementUnitsWorkflowInput) =>
    new WorkflowResponse(restoreMeasurementUnitsStep(input))
)
