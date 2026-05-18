import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setProductProducersWorkflow } from "../../../../../workflows/producer"
import {
  ensureProducerIdsExist,
  getProducerActiveProductCounts,
  listProducerIdsForProduct,
  listProducersByIds,
  retrieveProductOrThrow,
  toProducerResponse,
} from "../../../producers/utils"
import type { AdminSetProductProducersSchemaType } from "../../../producers/validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id ?? ""

  await retrieveProductOrThrow(req.scope, productId)

  const producerIds = await listProducerIdsForProduct(req.scope, productId)
  const producers = await listProducersByIds(req.scope, producerIds)
  const activeProductCounts = await getProducerActiveProductCounts(
    req.scope,
    producerIds
  )

  res.status(200).json({
    producer_ids: producerIds,
    producers: producers.map((producer) =>
      toProducerResponse(producer, activeProductCounts.get(producer.id) ?? 0)
    ),
  })
}

export async function POST(
  req: MedusaRequest<AdminSetProductProducersSchemaType>,
  res: MedusaResponse
) {
  const productId = req.params.id ?? ""
  const producerIds = await ensureProducerIdsExist(
    req.scope,
    req.validatedBody.producer_ids
  )

  await retrieveProductOrThrow(req.scope, productId)
  // Product-side assignment is an explicit replacement operation for one product.
  // Producer-side batch assignment rejects products owned by another producer.
  await setProductProducersWorkflow(req.scope).run({
    input: {
      producer_ids: producerIds,
      product_id: productId,
    },
  })

  const nextProducerIds = await listProducerIdsForProduct(req.scope, productId)
  const producers = await listProducersByIds(req.scope, nextProducerIds)
  const activeProductCounts = await getProducerActiveProductCounts(
    req.scope,
    nextProducerIds
  )

  res.status(200).json({
    producer_ids: nextProducerIds,
    producers: producers.map((producer) =>
      toProducerResponse(producer, activeProductCounts.get(producer.id) ?? 0)
    ),
  })
}
