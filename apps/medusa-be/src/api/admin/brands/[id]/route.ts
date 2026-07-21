import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  deleteBrandsWorkflow,
  updateBrandsWorkflow,
} from "../../../../workflows/brand"
import {
  getBrandActiveProductCounts,
  retrieveBrandOrThrow,
  toBrandResponse,
} from "../utils"
import type { AdminUpdateBrandSchemaType } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""
  const brand = await retrieveBrandOrThrow(req.scope, brandId, {
    withDeleted: true,
  })
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<AdminUpdateBrandSchemaType>,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""

  const { result } = await updateBrandsWorkflow(req.scope).run({
    input: {
      selector: {
        id: brandId,
      },
      update: req.validatedBody,
    },
  })

  const updated = result[0]
  const brand = await retrieveBrandOrThrow(req.scope, updated?.id ?? brandId)
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
  })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const id = req.params.id ?? ""

  await deleteBrandsWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  res.status(200).json({
    deleted: true,
    id,
    object: "brand",
  })
}
