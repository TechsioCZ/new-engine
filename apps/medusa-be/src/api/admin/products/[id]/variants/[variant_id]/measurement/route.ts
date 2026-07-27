import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteProductVariantMeasurementWorkflow } from "../../../../../../../workflows/measurement-unit/workflows/delete-product-variant-measurement"
import { setProductVariantMeasurementWorkflow } from "../../../../../../../workflows/measurement-unit/workflows/set-product-variant-measurement"
import {
  retrieveProductMeasurement,
  retrieveProductOrThrow,
  retrieveProductVariantOrThrow,
  toProductVariantMeasurementDetailResponse,
} from "../../../../../measurement-units/utils"
import type { AdminSetProductVariantMeasurementSchemaType } from "../../../../../measurement-units/validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""
  const productVariantId = req.params.variant_id ?? ""

  await retrieveProductOrThrow(req.scope, productId)
  await retrieveProductVariantOrThrow(req.scope, productId, productVariantId)

  const measurement = await retrieveProductMeasurement(req.scope, productId)

  res.status(200).json(
    toProductVariantMeasurementDetailResponse({
      measurement,
      productVariantId,
    })
  )
}

export async function POST(
  req: MedusaRequest<AdminSetProductVariantMeasurementSchemaType>,
  res: MedusaResponse
) {
  const productId = req.params.id ?? ""
  const productVariantId = req.params.variant_id ?? ""

  await setProductVariantMeasurementWorkflow(req.scope).run({
    input: {
      product_id: productId,
      product_unit_quantity: req.validatedBody.product_unit_quantity,
      product_variant_id: productVariantId,
    },
  })

  const measurement = await retrieveProductMeasurement(req.scope, productId)

  res.status(200).json(
    toProductVariantMeasurementDetailResponse({
      measurement,
      productVariantId,
    })
  )
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""
  const productVariantId = req.params.variant_id ?? ""

  await deleteProductVariantMeasurementWorkflow(req.scope).run({
    input: {
      product_id: productId,
      product_variant_id: productVariantId,
    },
  })

  res.status(200).json({
    deleted: true,
    id: productVariantId,
    object: "product_variant_measurement",
  })
}
