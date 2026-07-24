import type { MedusaContainer, Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { ProductBrandLink } from "../../../links/product-brand"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"
import {
  BRAND_SEARCH_PROJECTION_LOCK_KEY,
  type BrandSearchProjectionChangedEventData,
  buildBrandSearchProjectionEventData,
} from "../events"

type ProductBrandLinkRecord = {
  product_id?: string
}

export type BrandSearchProjectionTargets =
  BrandSearchProjectionChangedEventData & {
    lock_keys: string[]
  }

export const buildBrandSearchProjectionLockKeys = ({
  brand_ids: brandIds,
  product_ids: productIds,
}: BrandSearchProjectionChangedEventData) =>
  brandIds.length || productIds.length ? [BRAND_SEARCH_PROJECTION_LOCK_KEY] : []

export const resolveBrandSearchProjectionTargets = async (
  input: BrandSearchProjectionChangedEventData,
  container: MedusaContainer
): Promise<BrandSearchProjectionTargets> => {
  const normalized = buildBrandSearchProjectionEventData({
    brandIds: input.brand_ids,
    productIds: input.product_ids,
  })

  if (!isMeilisearchEnabled()) {
    return {
      ...normalized,
      lock_keys: [],
    }
  }

  const productIds = new Set(normalized.product_ids)

  if (normalized.brand_ids.length) {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { data } = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id"],
      filters: {
        brand_id: { $in: normalized.brand_ids },
      },
    })

    for (const link of data as ProductBrandLinkRecord[]) {
      if (link.product_id) {
        productIds.add(link.product_id)
      }
    }
  }

  const targets = buildBrandSearchProjectionEventData({
    brandIds: normalized.brand_ids,
    productIds: [...productIds],
  })

  return {
    ...targets,
    lock_keys: buildBrandSearchProjectionLockKeys(targets),
  }
}

export const resolveBrandSearchProjectionTargetsStep = createStep(
  "resolve-brand-search-projection-targets",
  async (input: BrandSearchProjectionChangedEventData, { container }) =>
    new StepResponse(
      await resolveBrandSearchProjectionTargets(input, container)
    )
)
