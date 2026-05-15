import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  getProducerActiveProductCounts,
  listAndCountProducts,
  listAndCountProductsByIds,
  listProducersByIds,
  listProductProducerLinks,
  listProductProducerLinksByProductIds,
  retrieveProducerOrThrow,
  toProducerResponse,
  toProductResponse,
  uniqueIds,
} from "../../utils"
import type { AdminGetProducerProductOptionsSchemaType } from "../../validators"

const PRODUCT_ORDER = { title: "ASC" as const, id: "ASC" as const }

type ProductIdGroup = string[] | { $nin?: string[] }

type ProductPageOptions = {
  limit: number
  offset: number
  q?: string
}

const getPageWindow = (
  options: ProductPageOptions,
  remainingOffset: number,
  remainingLimit: number
) => ({
  order: PRODUCT_ORDER,
  q: options.q,
  skip: remainingLimit > 0 ? remainingOffset : 0,
  take: remainingLimit > 0 ? remainingLimit : 1,
})

const getProductGroupFilters = (group: ProductIdGroup) => {
  if (Array.isArray(group) || !group.$nin?.length) {
    return {}
  }

  return { id: { $nin: uniqueIds(group.$nin) } }
}

const listProductGroup = ({
  group,
  options,
  remainingLimit,
  remainingOffset,
  scope,
}: {
  group: ProductIdGroup
  options: ProductPageOptions
  remainingLimit: number
  remainingOffset: number
  scope: MedusaContainer
}) => {
  const pageWindow = getPageWindow(options, remainingOffset, remainingLimit)

  if (Array.isArray(group)) {
    return listAndCountProductsByIds(scope, group, pageWindow)
  }

  return listAndCountProducts(scope, getProductGroupFilters(group), pageWindow)
}

const listRankedProductPage = async (
  scope: MedusaContainer,
  productIdGroups: ProductIdGroup[],
  options: ProductPageOptions
) => {
  let count = 0
  let remainingOffset = options.offset
  let remainingLimit = options.limit
  const page: ReturnType<typeof toProductResponse>[] = []

  for (const group of productIdGroups) {
    const shouldReadPage = remainingLimit > 0
    const [products, groupCount] = await listProductGroup({
      group,
      options,
      remainingLimit,
      remainingOffset,
      scope,
    })

    count += groupCount

    if (!shouldReadPage) {
      continue
    }

    if (remainingOffset >= groupCount) {
      remainingOffset -= groupCount
      continue
    }

    if (remainingLimit > 0) {
      page.push(...products.map(toProductResponse))
      remainingLimit -= products.length
    }

    remainingOffset = 0
  }

  return { count, page }
}

export async function GET(
  req: MedusaRequest<unknown, AdminGetProducerProductOptionsSchemaType>,
  res: MedusaResponse
) {
  const producerId = req.params.id ?? ""

  await retrieveProducerOrThrow(req.scope, producerId)

  const { limit, offset, q } = req.validatedQuery
  const allLinks = await listProductProducerLinks(req.scope)
  const currentProductIds = allLinks
    .filter((link) => link.producer_id === producerId)
    .map((link) => link.product_id)
  const linkedProductIds = allLinks.map((link) => link.product_id)
  const otherProductIds = allLinks
    .filter((link) => link.producer_id !== producerId)
    .map((link) => link.product_id)
  const groups = q
    ? [currentProductIds, { $nin: linkedProductIds }, otherProductIds]
    : [currentProductIds, { $nin: linkedProductIds }]
  const { count, page: products } = await listRankedProductPage(
    req.scope,
    groups,
    { limit, offset, q }
  )
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
  const options = products.map((product) => {
    const assignedProducerId = producerIdByProductId.get(product.id)

    return {
      assigned_producer: assignedProducerId
        ? (producersById.get(assignedProducerId) ?? null)
        : null,
      product,
    }
  })

  res.status(200).json({
    count,
    limit,
    offset,
    products: options,
  })
}
