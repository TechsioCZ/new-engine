import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { restoreMeasurementUnitsStep } from "../steps/restore-measurement-units"
import type { RestoreMeasurementUnitsWorkflowInput } from "../types"

export const restoreMeasurementUnitsWorkflow = createWorkflow(
  "restore-measurement-units",
  (input: RestoreMeasurementUnitsWorkflowInput) => {
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
    const restored = restoreMeasurementUnitsStep(input)
    releaseLockStep(releaseInput)

    return new WorkflowResponse(restored)
  }
)
