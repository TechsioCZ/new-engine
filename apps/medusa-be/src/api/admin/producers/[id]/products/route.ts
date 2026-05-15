import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setProducerProductsWorkflow } from "../../../../../workflows/producer"
import {
  ensureProductIdsExist,
  ensureProductsAssignableToProducer,
  listAndCountProductsByIds,
  listProductIdsForProducer,
  listProductsByIds,
  retrieveProducerOrThrow,
  toProductResponse,
  uniqueIds,
} from "../../utils"
import type {
  AdminGetProducersSchemaType,
  AdminSetProducerProductsSchemaType,
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
  req: MedusaRequest<unknown, AdminGetProducersSchemaType>,
  res: MedusaResponse
) {
  const producerId = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, producerId)

  const { limit, offset, q } = req.validatedQuery
  const order = parseOrder(
    req.validatedQuery.order_by ?? req.validatedQuery.order
  )
  const productIds = await listProductIdsForProducer(req.scope, producerId)
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
  req: MedusaRequest<AdminSetProducerProductsSchemaType>,
  res: MedusaResponse
) {
  const producerId = req.params.id ?? ""
  const productIds = await ensureProductIdsExist(
    req.scope,
    req.validatedBody.product_ids
  )

  await retrieveProducerOrThrow(req.scope, producerId)
  await ensureProductsAssignableToProducer(req.scope, producerId, productIds)
  await setProducerProductsWorkflow(req.scope).run({
    input: {
      producer_id: producerId,
      product_ids: productIds,
    },
  })

  const nextProductIds = await listProductIdsForProducer(req.scope, producerId)
  const products = await listProductsByIds(req.scope, uniqueIds(nextProductIds))

  res.status(200).json({
    count: nextProductIds.length,
    product_ids: nextProductIds,
    products: products.map(toProductResponse),
  })
}
