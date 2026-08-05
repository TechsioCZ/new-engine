import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"

export const deleteMeasurementUnitsStep = createStep(
  "delete-measurement-units",
  async (input: DeleteMeasurementUnitsWorkflowInput, { container }) => {
    const service = getMeasurementUnitService(container)
    const ids = [...new Set(input.ids)].filter(Boolean)
    const units = ids.length
      ? await service.listMeasurementUnits(
          { id: { $in: ids } },
          {
            select: ["id", "code", "deleted_at"],
            withDeleted: true,
          },
        )
      : []
    const foundIds = new Set(units.map((unit) => unit.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))

    if (missingIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Measurement units were not found: ${missingIds.join(", ")}`,
      )
    }

    const activeIds = units
      .filter((unit) => !unit.deleted_at)
      .map((unit) => unit.id)

    if (activeIds.length) {
      await service.softDeleteMeasurementUnits(activeIds)
    }

    return new StepResponse(undefined, activeIds)
  },
  async (deletedIds, { container }) => {
    if (deletedIds?.length) {
      await getMeasurementUnitService(container).restoreMeasurementUnits(
        deletedIds,
      )
    }
  },
)
