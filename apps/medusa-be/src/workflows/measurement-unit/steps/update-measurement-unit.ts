import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  getMeasurementUnitService,
  type MeasurementUnitRecord,
} from "../../../utils/measurement-units"
import type { UpdateMeasurementUnitWorkflowInput } from "../types"
import { ensureUnitCodeAvailable, normalizeUnitCode } from "./helpers"

export const updateMeasurementUnitStep = createStep(
  "update-measurement-unit",
  async (input: UpdateMeasurementUnitWorkflowInput, { container }) => {
    const service = getMeasurementUnitService(container)
    const [previous] = (await service.listMeasurementUnits(
      {
        id: input.id,
      },
      {
        take: 1,
        withDeleted: true,
      }
    )) as MeasurementUnitRecord[]
    const update = { ...input.update }

    if (!previous) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Measurement unit with id "${input.id}" was not found`
      )
    }

    if (update.code) {
      update.code = await ensureUnitCodeAvailable({
        code: update.code,
        container,
        excludeId: input.id,
      })
    }

    if (
      update.base_quantity !== undefined &&
      !(Number.isFinite(update.base_quantity) && update.base_quantity > 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Measurement unit base quantity must be greater than zero."
      )
    }

    const updated = await service.updateMeasurementUnits({
      id: input.id,
      ...update,
      base_quantity: update.base_quantity,
      code: update.code ? normalizeUnitCode(update.code) : undefined,
      description:
        update.description === undefined ? undefined : update.description,
      name: update.name?.trim(),
      symbol: update.symbol?.trim(),
    })

    return new StepResponse(updated, previous)
  },
  async (previous, { container }) => {
    if (previous?.id) {
      await getMeasurementUnitService(container).updateMeasurementUnits({
        base_quantity: previous.base_quantity,
        code: previous.code,
        description: previous.description ?? null,
        id: previous.id,
        name: previous.name,
        symbol: previous.symbol,
      })
    }
  }
)
