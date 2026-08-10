import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { omitUndefined } from "@techsio/std/object"

import { deleteMeasurementUnitsWorkflow } from "../../../../workflows/measurement-unit/workflows/delete-measurement-units"
import { updateMeasurementUnitWorkflow } from "../../../../workflows/measurement-unit/workflows/update-measurement-unit"
import {
  retrieveMeasurementUnitOrThrow,
  toMeasurementUnitDetailResponse,
} from "../utils"
import type { AdminUpdateMeasurementUnitSchemaType } from "../validators"

const getRoute = async (req: MedusaRequest, res: MedusaResponse) => {
  const unitId = req.params["id"] ?? ""
  const unit = await retrieveMeasurementUnitOrThrow(req.scope, unitId, {
    withDeleted: true,
  })

  res.status(200).json({
    measurement_unit: await toMeasurementUnitDetailResponse(req.scope, unit),
  })
}

const postRoute = async (
  req: MedusaRequest<AdminUpdateMeasurementUnitSchemaType>,
  res: MedusaResponse,
) => {
  const unitId = req.params["id"] ?? ""

  await retrieveMeasurementUnitOrThrow(req.scope, unitId)

  const { result } = await updateMeasurementUnitWorkflow(req.scope).run({
    input: {
      id: unitId,
      update: omitUndefined(req.validatedBody),
    },
  })

  const unit = await retrieveMeasurementUnitOrThrow(
    req.scope,
    result?.id ?? unitId,
  )

  res.status(200).json({
    measurement_unit: await toMeasurementUnitDetailResponse(req.scope, unit),
  })
}

const deleteRoute = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = req.params["id"] ?? ""

  await retrieveMeasurementUnitOrThrow(req.scope, id)
  await deleteMeasurementUnitsWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  res.status(200).json({
    deleted: true,
    id,
    object: "measurement_unit",
  })
}

export { deleteRoute as DELETE, getRoute as GET, postRoute as POST }
