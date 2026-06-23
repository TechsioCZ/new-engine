import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ProductBrandLink } from "../../../../../links/product-brand"
import {
  getBrandActiveProductCounts,
  listAndCountProducts,
  listAndCountProductsByIds,
  listBrandsByIds,
  listProductBrandLinksByProductIds,
  listProductIdsForBrand,
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
  const currentProductIds = await listProductIdsForBrand(req.scope, brandId)
  const groups = q
    ? [currentProductIds, { $nin: currentProductIds }]
    : await (async () => {
        const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
        const { data: activeBrands } = await query.graph({
          entity: "brand",
          fields: ["id"],
          filters: {
            deleted_at: null,
          },
        })
        const activeBrandIds = Array.isArray(activeBrands)
          ? activeBrands.flatMap((brand) => {
              if (!(brand && typeof brand === "object" && "id" in brand)) {
                return []
              }

              const activeBrandId: unknown = brand.id

              return typeof activeBrandId === "string" ? [activeBrandId] : []
            })
          : []

        const { data: linkedProducts } = await query.graph({
          entity: ProductBrandLink.entryPoint,
          fields: ["product_id"],
          filters: {
            brand_id: { $in: activeBrandIds },
            product_id: { $nin: currentProductIds },
          },
        })
        const linkedProductIds = uniqueIds(
          Array.isArray(linkedProducts)
            ? linkedProducts.flatMap((link) => {
                if (
                  !(link && typeof link === "object" && "product_id" in link)
                ) {
                  return []
                }

                const productId: unknown = link.product_id

                return typeof productId === "string" ? [productId] : []
              })
            : []
        )

        return [
          currentProductIds,
          { $nin: uniqueIds([...currentProductIds, ...linkedProductIds]) },
        ]
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
    linkedBrands.filter((brand) => !brand.deleted_at).map((brand) => brand.id)
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
