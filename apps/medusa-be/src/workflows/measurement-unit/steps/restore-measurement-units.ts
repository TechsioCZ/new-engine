import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { RestoreMeasurementUnitsWorkflowInput } from "../types"
import { getMeasurementUnitService } from "./helpers"

export const restoreMeasurementUnitsStep = createStep(
  "restore-measurement-units",
  async (input: RestoreMeasurementUnitsWorkflowInput, { container }) => {
    await getMeasurementUnitService(container).restoreMeasurementUnits(
      input.ids
    )

    return new StepResponse(input.ids, input.ids)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getMeasurementUnitService(container).softDeleteMeasurementUnits(
        restoredIds
      )
    }
  }
)
