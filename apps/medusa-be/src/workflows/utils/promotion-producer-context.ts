import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type PromotionContextSource = {
  items?: unknown[]
}

type PromotionContextItem = Record<string, unknown> & {
  product_id?: string | null
  product?: { id?: string | null } | null
  variant?: {
    product_id?: string | null
    product?: { id?: string | null } | null
  } | null
}

type ProductProducerLinkRecord = {
  product_id?: string
  producer_id?: string
}

export async function buildProducerPromotionContext(
  source: PromotionContextSource | undefined,
  container: MedusaContainer,
  productProducerLinkEntryPoint: string
): Promise<Record<string, unknown>> {
  const items = (source?.items ?? []) as PromotionContextItem[]
  const productIds = Array.from(
    new Set(items.map(getItemProductId).filter((id): id is string => !!id))
  )

  if (!productIds.length) {
    return {}
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: productProducerLinkEntryPoint,
    fields: ["product_id", "producer_id"],
    filters: {
      product_id: productIds,
    },
  })

  const producerIdsByProductId = new Map<string, string[]>()
  for (const link of data as ProductProducerLinkRecord[]) {
    if (!(link.product_id && link.producer_id)) {
      continue
    }

    const producerIds = producerIdsByProductId.get(link.product_id) ?? []
    producerIds.push(link.producer_id)
    producerIdsByProductId.set(link.product_id, producerIds)
  }

  return {
    items: items.map((item) => ({
      ...item,
      producer_ids:
        producerIdsByProductId.get(getItemProductId(item) ?? "") ?? [],
    })),
  }
}

function getItemProductId(item: PromotionContextItem) {
  return (
    item.product_id ??
    item.product?.id ??
    item.variant?.product_id ??
    item.variant?.product?.id
  )
}
