import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { deleteMeasurementUnitsStep } from "../steps/delete-measurement-units"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"

export const deleteMeasurementUnitsWorkflow = createWorkflow(
  "delete-measurement-units-workflow",
  (input: DeleteMeasurementUnitsWorkflowInput) => {
    const lockInput = transform(input, (current) => ({
      key: [...new Set(current.ids)]
        .filter(Boolean)
        .sort()
        .map((id) => `measurement-unit:${id}`),
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform(lockInput, (current) => ({
      key: current.key,
    }))

    acquireLockStep(lockInput)
    const deleted = deleteMeasurementUnitsStep(input)
    releaseLockStep(releaseInput)

    return new WorkflowResponse(deleted)
  }
)
