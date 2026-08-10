import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { getMeasurementUnitService } from "../../../utils/measurement-units"
import type { CreateMeasurementUnitsWorkflowInput } from "../types"
import { normalizeDescription, normalizeUnitCode } from "./helpers"

export const createMeasurementUnitsStep = createStep(
  "create-measurement-units",
  async (input: CreateMeasurementUnitsWorkflowInput, { container }) => {
    const normalizedCodes = input.units.map((unit) =>
      normalizeUnitCode(unit.code),
    )
    const invalidTextUnit = input.units.find(
      (unit, index) =>
        normalizedCodes[index]?.length === 0 ||
        unit.name.trim().length === 0 ||
        unit.symbol.trim().length === 0,
    )
    const invalidBaseQuantityUnit = input.units.find(
      (unit) =>
        !(Number.isFinite(unit.base_quantity) && unit.base_quantity > 0),
    )
    const duplicateCodes = normalizedCodes.filter(
      (code, index) => normalizedCodes.indexOf(code) !== index,
    )

    if (invalidBaseQuantityUnit) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Measurement unit base quantity must be greater than zero.",
      )
    }

    if (invalidTextUnit) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Measurement unit code, name, and symbol must not be empty.",
      )
    }

    if (duplicateCodes.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Measurement unit codes must be unique: ${[...new Set(duplicateCodes)].join(", ")}`,
      )
    }

    const service = getMeasurementUnitService(container)
    const existingUnits =
      normalizedCodes.length > 0
        ? await service.listMeasurementUnits(
            {
              code: { $in: normalizedCodes },
            },
            {
              select: ["code"],
              withDeleted: true,
            },
          )
        : []

    if (existingUnits.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Measurement unit codes already exist: ${[
          ...new Set(existingUnits.map((unit) => unit.code)),
        ].join(", ")}`,
      )
    }

    const units = await service.createMeasurementUnits(
      input.units.map((unit) => ({
        base_quantity: unit.base_quantity,
        code: normalizeUnitCode(unit.code),
        description: normalizeDescription(unit.description),
        name: unit.name.trim(),
        symbol: unit.symbol.trim(),
      })),
    )
    const createdUnits = Array.isArray(units) ? units : [units]

    return new StepResponse(
      createdUnits,
      createdUnits.map((unit) => unit.id),
    )
  },
  async (createdIds, { container }) => {
    if (createdIds !== undefined && createdIds.length > 0) {
      await getMeasurementUnitService(container).deleteMeasurementUnits(
        createdIds,
      )
    }
  },
)
