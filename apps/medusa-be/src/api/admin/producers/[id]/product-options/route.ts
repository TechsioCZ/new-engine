import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getProducerActiveProductCounts,
  listAllProducts,
  listProducersByIds,
  listProductProducerLinksByProductIds,
  retrieveProducerOrThrow,
  toProducerResponse,
  toProductResponse,
  uniqueIds,
} from "../../utils"
import type { AdminGetProducerProductOptionsSchemaType } from "../../validators"

const matchesProductSearch = (
  product: ReturnType<typeof toProductResponse>,
  search: string
) =>
  [product.id, product.title, product.handle, product.status].some((value) =>
    value?.toLocaleLowerCase().includes(search)
  )

const getAssignmentRank = (
  assignedProducerId: string | undefined,
  currentProducerId: string
) => {
  if (assignedProducerId === currentProducerId) {
    return 0
  }

  if (!assignedProducerId) {
    return 1
  }

  return 2
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetProducerProductOptionsSchemaType>,
  res: MedusaResponse
) {
  const producerId = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, producerId)

  const { limit, offset, q } = req.validatedQuery
  const search = q?.trim().toLocaleLowerCase() ?? ""
  const products = (await listAllProducts(req.scope)).map(toProductResponse)
  const links = await listProductProducerLinksByProductIds(
    req.scope,
    products.map((product) => product.id)
  )
  const linkedProducerIds = uniqueIds(links.map((link) => link.producer_id))
  const linkedProducers = await listProducersByIds(req.scope, linkedProducerIds)
  const activeProductCounts = await getProducerActiveProductCounts(
    req.scope,
    linkedProducers.map((producer) => producer.id)
  )
  const producersById = new Map(
    linkedProducers.map((producer) => [
      producer.id,
      toProducerResponse(producer, activeProductCounts.get(producer.id) ?? 0),
    ])
  )
  const producerIdByProductId = new Map(
    links.map((link) => [link.product_id, link.producer_id])
  )
  const options = products
    .filter((product) => {
      const assignedProducerId = producerIdByProductId.get(product.id)

      if (search && !matchesProductSearch(product, search)) {
        return false
      }

      return search
        ? true
        : !assignedProducerId || assignedProducerId === producerId
    })
    .map((product) => {
      const assignedProducerId = producerIdByProductId.get(product.id)

      return {
        assigned_producer: assignedProducerId
          ? (producersById.get(assignedProducerId) ?? null)
          : null,
        product,
      }
    })
    .sort((left, right) => {
      const leftRank = getAssignmentRank(left.assigned_producer?.id, producerId)
      const rightRank = getAssignmentRank(
        right.assigned_producer?.id,
        producerId
      )

      if (leftRank !== rightRank) {
        return leftRank - rightRank
      }

      return (left.product.title ?? left.product.id).localeCompare(
        right.product.title ?? right.product.id
      )
    })

  res.status(200).json({
    count: options.length,
    limit,
    offset,
    products: options.slice(offset, offset + limit),
  })
}
