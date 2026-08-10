import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

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

const PRODUCT_ORDER: { id: "ASC"; title: "ASC" } = {
  id: "ASC",
  title: "ASC",
}

type ProductIdGroup = string[] | { $nin?: string[] }

interface ProductPageOptions {
  limit: number
  offset: number
  q?: string | undefined
}

const getPageWindow = (
  options: ProductPageOptions,
  remainingOffset: number,
  remainingLimit: number,
) => ({
  order: PRODUCT_ORDER,
  q: options.q,
  skip: remainingLimit > 0 ? remainingOffset : 0,
  take: remainingLimit > 0 ? remainingLimit : 1,
})

const getProductGroupFilters = (group: ProductIdGroup) => {
  if (
    Array.isArray(group) ||
    group.$nin === undefined ||
    group.$nin.length === 0
  ) {
    return {}
  }

  return { id: { $nin: uniqueIds(group.$nin) } }
}

const listProductGroup = async ({
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
    return await listAndCountProductsByIds(scope, group, pageWindow)
  }

  return await listAndCountProducts(
    scope,
    getProductGroupFilters(group),
    pageWindow,
  )
}

const listRankedProductPage = async (
  scope: MedusaContainer,
  productIdGroups: ProductIdGroup[],
  options: ProductPageOptions,
) => {
  let count = 0
  let remainingOffset = options.offset
  let remainingLimit = options.limit
  const page: ReturnType<typeof toProductResponse>[] = []

  const readGroup = async (index: number): Promise<void> => {
    if (index >= productIdGroups.length) {
      return
    }

    const group = productIdGroups[index]
    if (group === undefined) {
      return
    }

    const shouldReadPage = remainingLimit > 0
    const [products, groupCount] = await listProductGroup({
      group,
      options,
      remainingLimit,
      remainingOffset,
      scope,
    })

    count += groupCount

    if (shouldReadPage) {
      if (remainingOffset >= groupCount) {
        remainingOffset -= groupCount
      } else {
        page.push(...products.map(toProductResponse))
        remainingLimit -= products.length
        remainingOffset = 0
      }
    }

    await readGroup(index + 1)
  }

  await readGroup(0)
  return { count, page }
}

const getBrandProductOptions = async (
  req: AuthenticatedMedusaRequest<
    unknown,
    AdminGetBrandProductOptionsSchemaType
  >,
  res: MedusaResponse,
) => {
  const brandId = req.params["id"] ?? ""

  await retrieveBrandOrThrow(req.scope, brandId)

  const { limit, offset, q } = req.validatedQuery
  const currentProductIds = await listProductIdsForBrand(req.scope, brandId)
  const groups =
    q !== undefined && q !== ""
      ? [currentProductIds, { $nin: currentProductIds }]
      : await (async () => {
          const query = req.scope.resolve<Query>(
            ContainerRegistrationKeys.QUERY,
          )
          const activeBrandsResult: unknown = await query.graph({
            entity: "brand",
            fields: ["id"],
            filters: {
              deleted_at: null,
            },
          })
          const rawActiveBrands: unknown = isRecord(activeBrandsResult)
            ? getRecordValue(activeBrandsResult, "data")
            : undefined
          const activeBrands: unknown[] = Array.isArray(rawActiveBrands)
            ? rawActiveBrands
            : []
          const activeBrandIds = activeBrands.flatMap((brand) => {
            if (!isRecord(brand)) {
              return []
            }

            const activeBrandId = getRecordValue(brand, "id")
            return typeof activeBrandId === "string" ? [activeBrandId] : []
          })

          const linkedProductsResult: unknown = await query.graph({
            entity: ProductBrandLink.entryPoint,
            fields: ["product_id"],
            filters: {
              brand_id: { $in: activeBrandIds },
              product_id: { $nin: currentProductIds },
            },
          })
          const rawLinkedProducts: unknown = isRecord(linkedProductsResult)
            ? getRecordValue(linkedProductsResult, "data")
            : undefined
          const linkedProducts: unknown[] = Array.isArray(rawLinkedProducts)
            ? rawLinkedProducts
            : []
          const linkedProductIds = uniqueIds(
            linkedProducts.flatMap((link) => {
              if (!isRecord(link)) {
                return []
              }

              const productId = getRecordValue(link, "product_id")
              return typeof productId === "string" ? [productId] : []
            }),
          )

          return [
            currentProductIds,
            { $nin: uniqueIds([...currentProductIds, ...linkedProductIds]) },
          ]
        })()
  const { count, page: products } = await listRankedProductPage(
    req.scope,
    groups,
    { limit, offset, q },
  )
  const links = await listProductBrandLinksByProductIds(
    req.scope,
    products.map((product) => product.id),
  )
  const linkedBrandIds = uniqueIds(links.map((link) => link.brand_id))
  const linkedBrands = await listBrandsByIds(req.scope, linkedBrandIds)
  const activeProductCounts = await getBrandActiveProductCounts(
    req.scope,
    linkedBrands.map((brand) => brand.id),
  )
  const brandsById = new Map(
    linkedBrands.map((brand) => [
      brand.id,
      toBrandResponse(brand, activeProductCounts.get(brand.id) ?? 0),
    ]),
  )
  const activeBrandIds = new Set(
    linkedBrands.flatMap((brand) =>
      brand.deleted_at === null || brand.deleted_at === undefined
        ? [brand.id]
        : [],
    ),
  )
  const activeBrandIdByProductId = new Map(
    links.flatMap((link) =>
      activeBrandIds.has(link.brand_id)
        ? [[link.product_id, link.brand_id]]
        : [],
    ),
  )
  const options = products.map((product) => {
    const assignedBrandId = activeBrandIdByProductId.get(product.id)
    const assignedBrand =
      assignedBrandId === undefined || assignedBrandId === ""
        ? null
        : (brandsById.get(assignedBrandId) ?? null)

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

export { getBrandProductOptions as GET }
