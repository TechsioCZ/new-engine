import type {
  MedusaContainer,
  Query,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { getActiveBrandIds } from "../brand/brand-activity"

interface PromotionContextSource {
  items?: unknown[]
}

type PromotionContextItem = Record<string, unknown>

interface ProductBrandLinkRecord {
  brand_id: string
  product_id: string
}

interface ProductVariantRecord {
  id: string
  product_id: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isPromotionContextItem = (item: unknown): item is PromotionContextItem =>
  isRecord(item)

const isProductBrandLink = (
  value: unknown,
): value is ProductBrandLinkRecord => {
  if (!isRecord(value)) {
    return false
  }
  const { brand_id: brandId, product_id: productId } = value
  return typeof brandId === "string" && typeof productId === "string"
}

const isProductVariantRecord = (
  value: unknown,
): value is ProductVariantRecord => {
  if (!isRecord(value)) {
    return false
  }
  const { id, product_id: productId } = value
  return typeof id === "string" && typeof productId === "string"
}

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const getNestedId = (value: unknown): string | undefined =>
  isRecord(value) ? getString(value["id"]) : undefined

const getItemVariantId = (item: PromotionContextItem) =>
  getString(item["variant_id"]) ?? getNestedId(item["variant"])

const getDirectItemProductId = (item: PromotionContextItem) => {
  const { product, product_id: productId, variant } = item
  const candidates = [
    getString(productId),
    getNestedId(product),
    isRecord(variant) ? getString(variant["product_id"]) : undefined,
    isRecord(variant) ? getNestedId(variant["product"]) : undefined,
  ]
  return candidates.find((candidate) => candidate !== undefined)
}

const getItemProductId = (
  item: PromotionContextItem,
  productIdsByVariantId: ReadonlyMap<string, string> = new Map(),
) => {
  const directProductId = getDirectItemProductId(item)
  if (directProductId !== undefined) {
    return directProductId
  }

  const variantId = getItemVariantId(item)
  return variantId === undefined
    ? undefined
    : productIdsByVariantId.get(variantId)
}

const getGraphData = (result: unknown, context: string): unknown[] => {
  const data: unknown = isRecord(result) ? result["data"] : undefined
  if (!Array.isArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid result`,
    )
  }
  return data
}

const resolveProductIdsByVariantId = async (
  query: Pick<RemoteQueryFunction, "graph">,
  items: PromotionContextItem[],
) => {
  const variantIds = new Set<string>()
  for (const item of items) {
    if (getDirectItemProductId(item) !== undefined) {
      continue
    }
    const variantId = getItemVariantId(item)
    if (variantId !== undefined && variantId.length > 0) {
      variantIds.add(variantId)
    }
  }

  if (variantIds.size === 0) {
    return new Map<string, string>()
  }

  const result: unknown = await query.graph({
    entity: "variant",
    fields: ["id", "product_id"],
    filters: {
      id: { $in: [...variantIds] },
    },
  })
  const variants = getGraphData(result, "Product variant").filter(
    isProductVariantRecord,
  )
  return new Map(
    variants.map((variant) => [variant.id, variant.product_id] as const),
  )
}

export const buildBrandPromotionContext = async (
  source: PromotionContextSource | undefined,
  container: MedusaContainer,
  productBrandLinkEntryPoint: string,
): Promise<Record<string, unknown>> => {
  const items = Array.isArray(source?.items)
    ? source.items.filter(isPromotionContextItem)
    : []
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productIdsByVariantId = await resolveProductIdsByVariantId(query, items)
  const productIds = new Set<string>()
  for (const item of items) {
    const productId = getItemProductId(item, productIdsByVariantId)
    if (productId !== undefined && productId.length > 0) {
      productIds.add(productId)
    }
  }

  if (productIds.size === 0) {
    return {}
  }

  const result: unknown = await query.graph({
    entity: productBrandLinkEntryPoint,
    fields: ["product_id", "brand_id"],
    filters: {
      product_id: { $in: [...productIds] },
    },
  })
  const links = getGraphData(result, "Product brand link").filter(
    isProductBrandLink,
  )
  const activeBrandIds = await getActiveBrandIds(
    container,
    links.map((link) => link.brand_id),
  )
  const brandIdsByProductId = new Map<string, string[]>()
  for (const link of links) {
    if (!activeBrandIds.has(link.brand_id)) {
      continue
    }
    const brandIds = brandIdsByProductId.get(link.product_id) ?? []
    brandIds.push(link.brand_id)
    brandIdsByProductId.set(link.product_id, brandIds)
  }

  return {
    items: items.map((item) => {
      const itemContext = { ...item }
      delete itemContext["brand_ids"]
      const productId = getItemProductId(item, productIdsByVariantId)
      const brandIds =
        productId === undefined
          ? []
          : (brandIdsByProductId.get(productId) ?? [])
      return brandIds.length > 0
        ? { ...itemContext, brand_ids: brandIds }
        : itemContext
    }),
  }
}
