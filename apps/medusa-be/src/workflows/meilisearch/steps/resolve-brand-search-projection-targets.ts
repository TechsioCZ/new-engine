import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

import { ProductBrandLink } from "../../../links/product-brand"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"
import {
  BRAND_SEARCH_PROJECTION_LOCK_KEY,
  buildBrandSearchProjectionEventData,
} from "../events"
import type { BrandSearchProjectionChangedEventData } from "../events"

const productBrandLinksResultSchema = z.object({
  data: z.array(z.unknown()),
})
const productBrandLinkSchema = z.object({ product_id: z.unknown().optional() })

export type BrandSearchProjectionTargets =
  BrandSearchProjectionChangedEventData & {
    lock_keys: string[]
  }

export const buildBrandSearchProjectionLockKeys = ({
  brand_ids: brandIds,
  product_ids: productIds,
}: BrandSearchProjectionChangedEventData) =>
  brandIds.length > 0 || productIds.length > 0
    ? [BRAND_SEARCH_PROJECTION_LOCK_KEY]
    : []

export const resolveBrandSearchProjectionTargets = async (
  input: BrandSearchProjectionChangedEventData,
  container: MedusaContainer,
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

  if (normalized.brand_ids.length > 0) {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const result: unknown = await query.graph({
      entity: ProductBrandLink.entryPoint,
      fields: ["product_id"],
      filters: {
        brand_id: { $in: normalized.brand_ids },
      },
    })
    const parsedResult = productBrandLinksResultSchema.safeParse(result)
    if (!parsedResult.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Product-brand link query returned invalid data",
      )
    }

    for (const link of parsedResult.data.data) {
      const parsedLink = productBrandLinkSchema.safeParse(link)
      if (!parsedLink.success) {
        throw new MedusaError(
          MedusaError.Types.UNEXPECTED_STATE,
          "Product-brand link query returned an invalid record",
        )
      }
      const productId = parsedLink.data.product_id
      if (typeof productId === "string" && productId.length > 0) {
        productIds.add(productId)
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
      await resolveBrandSearchProjectionTargets(input, container),
    ),
)
