import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"

export const deleteMeasurementUnitsStep = createStep(
  "delete-measurement-units",
  async (input: DeleteMeasurementUnitsWorkflowInput, { container }) => {
    const service = getMeasurementUnitService(container)

    await service.softDeleteMeasurementUnits(input.ids)

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
