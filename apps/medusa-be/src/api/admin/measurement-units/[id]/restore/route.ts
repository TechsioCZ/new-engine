import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { restoreMeasurementUnitsWorkflow } from "../../../../../workflows/measurement-unit/workflows/restore-measurement-units"
import {
  retrieveMeasurementUnitOrThrow,
  toMeasurementUnitDetailResponse,
} from "../../utils"

const restoreMeasurementUnit = async (
  req: MedusaRequest,
  res: MedusaResponse,
) => {
  const id = req.params["id"] ?? ""

  await retrieveMeasurementUnitOrThrow(req.scope, id, { withDeleted: true })
  await restoreMeasurementUnitsWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  const unit = await retrieveMeasurementUnitOrThrow(req.scope, id)

  res.status(200).json({
    measurement_unit: await toMeasurementUnitDetailResponse(req.scope, unit),
  })
}

export { restoreMeasurementUnit as POST }
