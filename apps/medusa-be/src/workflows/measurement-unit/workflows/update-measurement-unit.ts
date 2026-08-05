import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import { normalizeUnitCode } from "../steps/helpers"
import { updateMeasurementUnitStep } from "../steps/update-measurement-unit"
import type { UpdateMeasurementUnitWorkflowInput } from "../types"

export const updateMeasurementUnitWorkflow = createWorkflow(
  "update-measurement-unit",
  (input: UpdateMeasurementUnitWorkflowInput) => {
    const lockInput = transform(input, (current) => ({
      key: [
        `measurement-unit:${current.id}`,
        ...(current.update.code
          ? [`measurement-unit-code:${normalizeUnitCode(current.update.code)}`]
          : []),
      ].sort(),
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform(lockInput, (current) => ({
      key: current.key,
    }))

    acquireLockStep(lockInput)
    const updated = updateMeasurementUnitStep(input)
    releaseLockStep(releaseInput)

    return new WorkflowResponse(updated)
  },
)
