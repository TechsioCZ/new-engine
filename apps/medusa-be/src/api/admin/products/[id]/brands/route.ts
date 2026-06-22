import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setProductBrandsWorkflow } from "../../../../../workflows/brand"
import {
  ensureBrandIdsExist,
  getBrandActiveProductCounts,
  listBrandIdsForProduct,
  listBrandsByIds,
  retrieveProductOrThrow,
  toBrandResponse,
} from "../../../brands/utils"
import type { AdminSetProductBrandsSchemaType } from "../../../brands/validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""

  await retrieveProductOrThrow(req.scope, productId)

  const brandIds = await listBrandIdsForProduct(req.scope, productId)
  const brands = await listBrandsByIds(req.scope, brandIds)
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    brandIds
  )

  res.status(200).json({
    brand_ids: brandIds,
    brands: brands.map((brand) =>
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0)
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminSetProductBrandsSchemaType>,
  res: MedusaResponse
) {
  const productId = req.params.id ?? ""
  const brandIds = await ensureBrandIdsExist(
    req.scope,
    req.validatedBody.brand_ids
  )

  await retrieveProductOrThrow(req.scope, productId)
  // Product-side assignment is an explicit replacement operation for one product.
  // Brand-side batch assignment rejects products owned by another brand.
  await setProductBrandsWorkflow(req.scope).run({
    input: {
      brand_ids: brandIds,
      product_id: productId,
    },
  })

  const nextBrandIds = await listBrandIdsForProduct(req.scope, productId)
  const brands = await listBrandsByIds(req.scope, nextBrandIds)
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    nextBrandIds
  )

  res.status(200).json({
    brand_ids: nextBrandIds,
    brands: brands.map((brand) =>
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0)
    ),
  })
}
