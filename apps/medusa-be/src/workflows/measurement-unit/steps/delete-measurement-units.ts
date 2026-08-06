import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { DeleteMeasurementUnitsWorkflowInput } from "../types"

export const deleteMeasurementUnitsStep = createStep(
  "delete-measurement-units",
  async (input: DeleteMeasurementUnitsWorkflowInput, { container }) => {
    const service = getMeasurementUnitService(container)
    const ids = [...new Set(input.ids)].filter((id) => id.length > 0)
    const units =
      ids.length > 0
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

    if (missingIds.length > 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Measurement units were not found: ${missingIds.join(", ")}`,
      )
    }

    const activeIds = units.flatMap((unit) =>
      unit.deleted_at === null ? [unit.id] : [],
    )

    if (activeIds.length > 0) {
      await service.softDeleteMeasurementUnits(activeIds)
    }

    return new StepResponse(undefined, activeIds)
  },
  async (deletedIds, { container }) => {
    if (deletedIds !== undefined && deletedIds.length > 0) {
      await getMeasurementUnitService(container).restoreMeasurementUnits(
        deletedIds,
      )
    }
  },
)
