import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createMeasurementUnitsStep } from "../steps"
import type { CreateMeasurementUnitsWorkflowInput } from "../types"

export const createMeasurementUnitsWorkflow = createWorkflow(
  "create-measurement-units-workflow",
  (input: CreateMeasurementUnitsWorkflowInput) =>
    new WorkflowResponse(createMeasurementUnitsStep(input))
)
