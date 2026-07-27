import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { createMeasurementUnitsStep } from "../steps/create-measurement-units"
import { normalizeUnitCode } from "../steps/helpers"
import type { CreateMeasurementUnitsWorkflowInput } from "../types"

export const createMeasurementUnitsWorkflow = createWorkflow(
  "create-measurement-units-workflow",
  (input: CreateMeasurementUnitsWorkflowInput) => {
    const lockInput = transform(input, (current) => ({
      key: [
        ...new Set(current.units.map((unit) => normalizeUnitCode(unit.code))),
      ]
        .filter(Boolean)
        .sort()
        .map((code) => `measurement-unit-code:${code}`),
      timeout: 5,
      ttl: 30,
    }))
    const releaseInput = transform(lockInput, (current) => ({
      key: current.key,
    }))

    acquireLockStep(lockInput)
    const created = createMeasurementUnitsStep(input)
    releaseLockStep(releaseInput)

    return new WorkflowResponse(created)
  }
)
