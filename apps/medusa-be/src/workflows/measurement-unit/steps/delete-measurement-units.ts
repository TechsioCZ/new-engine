import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"
import { getMeasurementUnitService } from "./helpers"

export const deleteMeasurementUnitsStep = createStep(
  "delete-measurement-units",
  async (input: DeleteMeasurementUnitsWorkflowInput, { container }) => {
    await getMeasurementUnitService(container).softDeleteMeasurementUnits(
      input.ids
    )

    return new StepResponse(undefined, input.ids)
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getMeasurementUnitService(container).restoreMeasurementUnits(
        deletedIds
      )
    }
  }
)
