import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { RestoreMeasurementUnitsWorkflowInput } from "../types"

export const restoreMeasurementUnitsStep = createStep(
  "restore-measurement-units",
  async (input: RestoreMeasurementUnitsWorkflowInput, { container }) => {
    const service = getMeasurementUnitService(container)
    const ids = [...new Set(input.ids)].filter(Boolean)
    const units = ids.length
      ? await service.listMeasurementUnits(
          { id: { $in: ids } },
          {
            select: ["id", "code", "deleted_at"],
            withDeleted: true,
          }
        )
      : []
    const foundIds = new Set(units.map((unit) => unit.id))
    const missingIds = ids.filter((id) => !foundIds.has(id))

    if (missingIds.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Measurement units were not found: ${missingIds.join(", ")}`
      )
    }

    const unitsToRestore = units.filter((unit) => !!unit.deleted_at)
    const idsToRestore = unitsToRestore.map((unit) => unit.id)
    const codesToRestore = unitsToRestore.map((unit) => unit.code)
    const duplicateCodes = codesToRestore.filter(
      (code, index) => codesToRestore.indexOf(code) !== index
    )

    if (duplicateCodes.length) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Only one measurement unit can be restored for each code: ${[
          ...new Set(duplicateCodes),
        ].join(", ")}`
      )
    }

    const conflictingUnits = codesToRestore.length
      ? await service.listMeasurementUnits({
          code: { $in: codesToRestore },
        })
      : []

    if (conflictingUnits.length) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Active measurement unit codes already exist: ${[
          ...new Set(conflictingUnits.map((unit) => unit.code)),
        ].join(", ")}`
      )
    }

    if (idsToRestore.length) {
      await service.restoreMeasurementUnits(idsToRestore)
    }

    return new StepResponse(ids, idsToRestore)
  },
  async (restoredIds, { container }) => {
    if (restoredIds?.length) {
      await getMeasurementUnitService(container).softDeleteMeasurementUnits(
        restoredIds
      )
    }
  }
)
