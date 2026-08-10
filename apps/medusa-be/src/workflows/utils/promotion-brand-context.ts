import type {
  MedusaContainer,
  Query,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

import { getActiveBrandIds } from "../brand/brand-activity"

interface PromotionContextSource {
  items?: unknown[]
}

interface PromotionBrandContext {
  items?: PromotionContextItem[]
}

const promotionContextItemSchema = z.looseObject({
  brand_ids: z.unknown().optional(),
  product: z.unknown().optional(),
  product_id: z.unknown().optional(),
  variant: z.unknown().optional(),
  variant_id: z.unknown().optional(),
})
type PromotionContextItem = z.infer<typeof promotionContextItemSchema>

const productBrandLinkSchema = z.object({
  brand_id: z.string(),
  product_id: z.string(),
})
type ProductBrandLinkRecord = z.infer<typeof productBrandLinkSchema>

const productVariantSchema = z.object({
  id: z.string(),
  product_id: z.string(),
})
type ProductVariantRecord = z.infer<typeof productVariantSchema>

const nestedIdSchema = z.object({ id: z.string() })
const graphDataSchema = z.object({ data: z.array(z.unknown()) })

const parsePromotionContextItems = (
  values: unknown[],
): PromotionContextItem[] => {
  const items: PromotionContextItem[] = []
  for (const value of values) {
    const parsed = promotionContextItemSchema.safeParse(value)
    if (parsed.success) {
      items.push(parsed.data)
    }
  }
  return items
}

const parseProductBrandLinks = (
  values: unknown[],
): ProductBrandLinkRecord[] => {
  const links: ProductBrandLinkRecord[] = []
  for (const value of values) {
    const parsed = productBrandLinkSchema.safeParse(value)
    if (parsed.success) {
      links.push(parsed.data)
    }
  }
  return links
}

const parseProductVariantRecords = (
  values: unknown[],
): ProductVariantRecord[] => {
  const variants: ProductVariantRecord[] = []
  for (const value of values) {
    const parsed = productVariantSchema.safeParse(value)
    if (parsed.success) {
      variants.push(parsed.data)
    }
  }
  return variants
}

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined

const getNestedId = (value: unknown): string | undefined => {
  const parsed = nestedIdSchema.safeParse(value)
  return parsed.success ? parsed.data.id : undefined
}

const getItemVariantId = (item: PromotionContextItem) =>
  getString(item.variant_id) ?? getNestedId(item.variant)

const getDirectItemProductId = (item: PromotionContextItem) => {
  const { product, product_id: productId, variant } = item
  const parsedVariant = promotionContextItemSchema.safeParse(variant)
  const candidates = [
    getString(productId),
    getNestedId(product),
    parsedVariant.success
      ? getString(parsedVariant.data.product_id)
      : undefined,
    parsedVariant.success ? getNestedId(parsedVariant.data.product) : undefined,
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
  const parsed = graphDataSchema.safeParse(result)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `${context} query returned an invalid result`,
    )
  }
  return parsed.data.data
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
  const variants = parseProductVariantRecords(
    getGraphData(result, "Product variant"),
  )
  return new Map(
    variants.map((variant): [string, string] => [
      variant.id,
      variant.product_id,
    ]),
  )
}

export const buildBrandPromotionContext = async (
  source: PromotionContextSource | undefined,
  container: MedusaContainer,
  productBrandLinkEntryPoint: string,
): Promise<PromotionBrandContext> => {
  const items = Array.isArray(source?.items)
    ? parsePromotionContextItems(source.items)
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
  const links = parseProductBrandLinks(
    getGraphData(result, "Product brand link"),
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
      delete itemContext.brand_ids
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
