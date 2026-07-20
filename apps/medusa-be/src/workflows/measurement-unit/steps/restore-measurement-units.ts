import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { RestoreMeasurementUnitsWorkflowInput } from "../types"

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
