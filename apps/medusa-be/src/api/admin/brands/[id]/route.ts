import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { deleteBrandsWorkflow } from "../../../../workflows/brand/workflows/delete-brands"
import { updateBrandsWorkflow } from "../../../../workflows/brand/workflows/update-brands"
import {
  getBrandActiveProductCounts,
  retrieveBrandOrThrow,
  toBrandResponse,
} from "../utils"
import type { AdminUpdateBrandSchemaType } from "../validators"

const getBrand = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const brandId = req.params["id"] ?? ""
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

const updateBrand = async (
  req: AuthenticatedMedusaRequest<AdminUpdateBrandSchemaType>,
  res: MedusaResponse,
) => {
  const brandId = req.params["id"] ?? ""

  const { result } = await updateBrandsWorkflow(req.scope).run({
    input: {
      selector: {
        id: brandId,
      },
      update: req.validatedBody,
    },
  })

  const [updated] = result
  const brand = await retrieveBrandOrThrow(req.scope, updated?.id ?? brandId)
  const activeProductCounts = await getBrandActiveProductCounts(req.scope, [
    brand.id,
  ])

  res.status(200).json({
    brand: toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
  })
}

const deleteBrand = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
) => {
  const id = req.params["id"] ?? ""

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

export { deleteBrand as DELETE, getBrand as GET, updateBrand as POST }
