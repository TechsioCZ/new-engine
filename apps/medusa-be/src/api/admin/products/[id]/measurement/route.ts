import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

import { deleteProductMeasurementWorkflow } from "../../../../../workflows/measurement-unit/workflows/delete-product-measurement"
import { setProductMeasurementWorkflow } from "../../../../../workflows/measurement-unit/workflows/set-product-measurement"
import {
  retrieveProductMeasurement,
  retrieveProductOrThrow,
  retrieveProductVariants,
  toProductMeasurementDetailResponse,
} from "../../../measurement-units/utils"
import type { AdminSetProductMeasurementSchemaType } from "../../../measurement-units/validators"

const get = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params["id"] ?? ""

  await retrieveProductOrThrow(req.scope, productId)

  const [measurement, variants] = await Promise.all([
    retrieveProductMeasurement(req.scope, productId),
    retrieveProductVariants(req.scope, productId),
  ])

  res
    .status(200)
    .json(toProductMeasurementDetailResponse({ measurement, variants }))
}

const post = async (
  req: MedusaRequest<AdminSetProductMeasurementSchemaType>,
  res: MedusaResponse,
) => {
  const productId = req.params["id"] ?? ""

  await setProductMeasurementWorkflow(req.scope).run({
    input: {
      measurement_unit_id: req.validatedBody.measurement_unit_id,
      product_id: productId,
    },
  })

  const [measurement, variants] = await Promise.all([
    retrieveProductMeasurement(req.scope, productId),
    retrieveProductVariants(req.scope, productId),
  ])

  res
    .status(200)
    .json(toProductMeasurementDetailResponse({ measurement, variants }))
}

const remove = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params["id"] ?? ""

  await retrieveProductOrThrow(req.scope, productId)
  await deleteProductMeasurementWorkflow(req.scope).run({
    input: {
      product_id: productId,
    },
  })

  res.status(200).json({
    deleted: true,
    id: productId,
    object: "product_measurement",
  })
}

export { remove as DELETE, get as GET, post as POST }
