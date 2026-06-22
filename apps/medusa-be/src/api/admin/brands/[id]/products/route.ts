import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setBrandProductsWorkflow } from "../../../../../workflows/brand"
import {
  ensureProductIdsExist,
  ensureProductsAssignableToBrand,
  listAndCountProductsByIds,
  listProductIdsForBrand,
  listProductsByIds,
  retrieveBrandOrThrow,
  toProductResponse,
  uniqueIds,
} from "../../utils"
import type {
  AdminGetBrandsSchemaType,
  AdminSetBrandProductsSchemaType,
} from "../../validators"

const ORDER_FIELDS = new Set(["handle", "status", "title", "created_at"])
const LEADING_DASH_REGEX = /^-/

const parseOrder = (
  input?: string
): { direction: "ASC" | "DESC"; field: string } => {
  const value = input ?? "title"
  const direction: "ASC" | "DESC" = value.startsWith("-") ? "DESC" : "ASC"
  const field = value.replace(LEADING_DASH_REGEX, "")

  if (!ORDER_FIELDS.has(field)) {
    return { direction: "ASC", field: "title" }
  }

  return { direction, field }
}

const getProductOrder = (field: string, direction: "ASC" | "DESC") => ({
  [field]: direction,
})

export async function GET(
  req: MedusaRequest<unknown, AdminGetBrandsSchemaType>,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""

  await retrieveBrandOrThrow(req.scope, brandId, { withDeleted: true })

  const { limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const productIds = await listProductIdsForBrand(req.scope, brandId)
  const [products, count] = await listAndCountProductsByIds(
    req.scope,
    uniqueIds(productIds),
    {
      order: getProductOrder(order.field, order.direction),
      q,
      skip: offset,
      take: limit,
    }
  )

  res.status(200).json({
    count,
    limit,
    offset,
    product_ids: productIds,
    products: products.map(toProductResponse),
  })
}

export async function POST(
  req: MedusaRequest<AdminSetBrandProductsSchemaType>,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""
  const productIds = await ensureProductIdsExist(
    req.scope,
    req.validatedBody.product_ids
  )

  await retrieveBrandOrThrow(req.scope, brandId)
  await ensureProductsAssignableToBrand(req.scope, brandId, productIds)
  await setBrandProductsWorkflow(req.scope).run({
    input: {
      brand_id: brandId,
      product_ids: productIds,
    },
  })

  const nextProductIds = await listProductIdsForBrand(req.scope, brandId)
  const products = await listProductsByIds(req.scope, uniqueIds(nextProductIds))

  res.status(200).json({
    count: nextProductIds.length,
    product_ids: nextProductIds,
    products: products.map(toProductResponse),
  })
}
