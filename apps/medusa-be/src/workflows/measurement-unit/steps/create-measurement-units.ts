import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CreateMeasurementUnitsWorkflowInput } from "../types"
import {
  ensureUnitCodeAvailable,
  getMeasurementUnitService,
  normalizeUnitCode,
} from "./helpers"

export const createMeasurementUnitsStep = createStep(
  "create-measurement-units",
  async (input: CreateMeasurementUnitsWorkflowInput, { container }) => {
    const normalizedCodes = input.units.map((unit) =>
      normalizeUnitCode(unit.code)
    )
    const duplicateCodes = normalizedCodes.filter(
      (code, index) => normalizedCodes.indexOf(code) !== index
    )

    if (duplicateCodes.length) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Measurement unit codes must be unique: ${[...new Set(duplicateCodes)].join(", ")}`
      )
    }

    for (const unit of input.units) {
      await ensureUnitCodeAvailable({
        code: unit.code,
        container,
      })
    }

    const service = getMeasurementUnitService(container)
    const units = await service.createMeasurementUnits(
      input.units.map((unit) => ({
        code: normalizeUnitCode(unit.code),
        description: unit.description ?? null,
        name: unit.name.trim(),
        symbol: unit.symbol.trim(),
      }))
    )
    const createdUnits = Array.isArray(units) ? units : [units]

    return new StepResponse(
      createdUnits,
      createdUnits.map((unit) => unit.id)
    )
  },
  async (createdIds, { container }) => {
    if (createdIds?.length) {
      await getMeasurementUnitService(container).deleteMeasurementUnits(
        createdIds
      )
    }
  }
)
