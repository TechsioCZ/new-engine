import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  getActiveBrandIds,
  getBrandActiveProductCounts,
  listAndCountProducts,
  listAndCountProductsByIds,
  listBrandsByIds,
  listProductIdsForBrand,
  listProductBrandLinks,
  listProductBrandLinksByProductIds,
  retrieveBrandOrThrow,
  toBrandResponse,
  toProductResponse,
  uniqueIds,
} from "../../utils"
import type { AdminGetBrandProductOptionsSchemaType } from "../../validators"

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
  req: MedusaRequest<unknown, AdminGetBrandProductOptionsSchemaType>,
  res: MedusaResponse
) {
  const brandId = req.params.id ?? ""

  await retrieveBrandOrThrow(req.scope, brandId)

  const { limit, offset, q } = req.validatedQuery
  const currentProductIds = await listProductIdsForBrand(
    req.scope,
    brandId
  )
  const groups = q
    ? [currentProductIds, { $nin: currentProductIds }]
    : await (async () => {
        const allLinks = await listProductBrandLinks(req.scope)
        const activeBrandIds = await getActiveBrandIds(
          req.scope,
          allLinks.map((link) => link.brand_id)
        )
        const linkedProductIds = allLinks
          .filter((link) => activeBrandIds.has(link.brand_id))
          .map((link) => link.product_id)

        return [currentProductIds, { $nin: linkedProductIds }]
      })()
  const { count, page: products } = await listRankedProductPage(
    req.scope,
    groups,
    { limit, offset, q }
  )
  const links = await listProductBrandLinksByProductIds(
    req.scope,
    products.map((product) => product.id)
  )
  const linkedBrandIds = uniqueIds(links.map((link) => link.brand_id))
  const linkedBrands = await listBrandsByIds(req.scope, linkedBrandIds)
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    linkedBrands.map((brand) => brand.id)
  )
  const brandsById = new Map(
    linkedBrands.map((brand) => [
      brand.id,
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
    ])
  )
  const activeBrandIds = new Set(
    linkedBrands
      .filter((brand) => !brand.deleted_at)
      .map((brand) => brand.id)
  )
  const activeBrandIdByProductId = new Map(
    links
      .filter((link) => activeBrandIds.has(link.brand_id))
      .map((link) => [link.product_id, link.brand_id])
  )
  const options = products.map((product) => {
    const assignedBrandId = activeBrandIdByProductId.get(product.id)
    const assignedBrand = assignedBrandId
      ? (brandsById.get(assignedBrandId) ?? null)
      : null

    return {
      assigned_brand: assignedBrand,
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
