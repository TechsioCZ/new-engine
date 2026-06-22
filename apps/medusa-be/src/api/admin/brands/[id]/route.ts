import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteBrandsWorkflow,
  restoreBrandsWorkflow,
  updateBrandsWorkflow,
} from "../../../../workflows/brand"
import {
  getBrandActiveProductCounts,
  retrieveBrandOrThrow,
  toBrandResponse,
} from "../utils"
import type { AdminUpdateBrandSchemaType } from "../validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const brandId = req.params.id ?? ""
  const brand = await retrieveBrandOrThrow(req.scope, brandId, {
    withDeleted: true,
  })
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(
      brand,
      activeProductCounts.get(brand.id) ?? 0
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminUpdateBrandSchemaType>,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""

  await retrieveBrandOrThrow(req.scope, brandId)

  const { result } = await updateBrandsWorkflow(req.scope).run({
    input: {
      selector: {
        id: brandId,
      },
      update: req.validatedBody,
    },
  })

  const updated = result[0]
  const brand = await retrieveBrandOrThrow(
    req.scope,
    updated?.id ?? brandId
  )
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(
      brand,
      activeProductCounts.get(brand.id) ?? 0
    ),
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? ""

  await retrieveBrandOrThrow(req.scope, id)
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

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id ?? ""

  await retrieveBrandOrThrow(req.scope, id, { withDeleted: true })
  await restoreBrandsWorkflow(req.scope).run({
    input: {
      ids: [id],
    },
  })

  const brand = await retrieveBrandOrThrow(req.scope, id)
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(
      brand,
      activeProductCounts.get(brand.id) ?? 0
    ),
  })
}
