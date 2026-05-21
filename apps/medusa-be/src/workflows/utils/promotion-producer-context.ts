import type {
  MedusaContainer,
  Query,
  RemoteQueryFunction,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PromotionContextSource = {
  items?: unknown[]
}

type PromotionContextItem = Record<string, unknown> & {
  producer_ids?: string[]
  product_id?: string | null
  product?: { id?: string | null } | null
  variant_id?: string | null
  variant?: {
    id?: string | null
    product_id?: string | null
    product?: { id?: string | null } | null
  } | null
}

type ProductProducerLinkRecord = {
  product_id?: string
  producer_id?: string
}

type ProductVariantRecord = {
  id?: string
  product_id?: string
}

export async function buildProducerPromotionContext(
  source: PromotionContextSource | undefined,
  container: MedusaContainer,
  productProducerLinkEntryPoint: string
): Promise<Record<string, unknown>> {
  const items = Array.isArray(source?.items)
    ? source.items.filter(isPromotionContextItem)
    : []
  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const productIdsByVariantId = await resolveProductIdsByVariantId(query, items)
  const productIds = Array.from(
    new Set(
      items
        .map((item) => getItemProductId(item, productIdsByVariantId))
        .filter((id): id is string => !!id)
    )
  )

  if (!productIds.length) {
    return {}
  }

  const { data } = await query.graph({
    entity: productProducerLinkEntryPoint,
    fields: ["product_id", "producer_id"],
    filters: {
      product_id: { $in: productIds },
    },
  })

  const producerIdsByProductId = new Map<string, string[]>()
  const links = Array.isArray(data) ? data.filter(isProductProducerLink) : []

  for (const link of links) {
    if (!(link.product_id && link.producer_id)) {
      continue
    }

    const producerIds = producerIdsByProductId.get(link.product_id) ?? []
    producerIds.push(link.producer_id)
    producerIdsByProductId.set(link.product_id, producerIds)
  }

  return {
    items: items.map((item) => {
      const { producer_ids: _producerIds, ...itemContext } = item
      const producerIds =
        producerIdsByProductId.get(
          getItemProductId(item, productIdsByVariantId) ?? ""
        ) ?? []

      return producerIds.length
        ? { ...itemContext, producer_ids: producerIds }
        : itemContext
    }),
  }
}

async function resolveProductIdsByVariantId(
  query: Pick<RemoteQueryFunction, "graph">,
  items: PromotionContextItem[]
) {
  const variantIds = Array.from(
    new Set(
      items
        .filter((item) => !getItemProductId(item))
        .map(getItemVariantId)
        .filter((id): id is string => !!id)
    )
  )

  if (!variantIds.length) {
    return new Map<string, string>()
  }

  const { data } = await query.graph({
    entity: "variant",
    fields: ["id", "product_id"],
    filters: {
      id: { $in: variantIds },
    },
  })

  return new Map(
    (Array.isArray(data) ? data.filter(isProductVariantRecord) : []).map(
      (variant) => [variant.id, variant.product_id]
    )
  )
}

function isPromotionContextItem(item: unknown): item is PromotionContextItem {
  return typeof item === "object" && item !== null
}

function isProductProducerLink(
  value: unknown
): value is Required<ProductProducerLinkRecord> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProductProducerLinkRecord).product_id === "string" &&
    typeof (value as ProductProducerLinkRecord).producer_id === "string"
  )
}

function isProductVariantRecord(
  value: unknown
): value is Required<ProductVariantRecord> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProductVariantRecord).id === "string" &&
    typeof (value as ProductVariantRecord).product_id === "string"
  )
}

function getItemProductId(
  item: PromotionContextItem,
  productIdsByVariantId = new Map<string, string>()
) {
  return (
    item.product_id ??
    item.product?.id ??
    item.variant?.product_id ??
    item.variant?.product?.id ??
    productIdsByVariantId.get(getItemVariantId(item) ?? "")
  )
}

function getItemVariantId(item: PromotionContextItem) {
  return item.variant_id ?? item.variant?.id
}
