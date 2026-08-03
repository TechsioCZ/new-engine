import type { MedusaContainer, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  SearchUtils,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { MeiliSearchService } from "@rokmohar/medusa-plugin-meilisearch"

import { BRANDS, MEILISEARCH } from "../"
import { isMeilisearchEnabled } from "../../../modules/meilisearch/env"
import type { BrandSearchProjectionTargets } from "./resolve-brand-search-projection-targets"

type SearchDocument = Record<string, unknown> & {
  id: string
}

export type BrandSearchProjectionResult = {
  brands_deleted: number
  brands_upserted: number
  products_deleted: number
  products_upserted: number
}

const emptyResult = (): BrandSearchProjectionResult => ({
  brands_deleted: 0,
  brands_upserted: 0,
  products_deleted: 0,
  products_upserted: 0,
})

const asSearchDocuments = (records: Record<string, unknown>[]) =>
  records.filter(
    (record): record is SearchDocument => typeof record["id"] === "string"
  )

export const reconcileBrandSearchProjection = async (
  input: BrandSearchProjectionTargets,
  container: MedusaContainer
): Promise<BrandSearchProjectionResult> => {
  if (
    !(
      isMeilisearchEnabled() &&
      (input.brand_ids.length || input.product_ids.length)
    )
  ) {
    return emptyResult()
  }

  const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const meilisearch = container.resolve<MeiliSearchService>(MEILISEARCH)
  const result = emptyResult()

  if (input.brand_ids.length) {
    const fields = meilisearch.getFieldsForType(BRANDS)
    const indexes = meilisearch.getIndexesByType(BRANDS)
    const { data } = await query.graph({
      entity: "brand",
      fields,
      filters: {
        id: input.brand_ids,
      },
    })
    const brands = asSearchDocuments(data as Record<string, unknown>[])
    const activeIds = new Set(brands.map((brand) => brand.id))
    const deletedIds = input.brand_ids.filter(
      (brandId) => !activeIds.has(brandId)
    )
    const transformedBrands = brands.map((brand) => ({
      ...brand,
      ...(typeof brand["handle"] === "string"
        ? { handle: `/store/brands/${brand["handle"]}/products` }
        : {}),
    }))

    await Promise.all(
      indexes.flatMap((index) => [
        ...(transformedBrands.length
          ? [
              meilisearch.addDocuments(index, transformedBrands, BRANDS, {
                container,
              }),
            ]
          : []),
        ...(deletedIds.length
          ? [meilisearch.deleteDocuments(index, deletedIds)]
          : []),
      ])
    )

    result.brands_upserted = transformedBrands.length
    result.brands_deleted = deletedIds.length
  }

  if (input.product_ids.length) {
    const productType = SearchUtils.indexTypes.PRODUCTS
    const fields = meilisearch.getFieldsForType(productType)
    const indexes = meilisearch.getIndexesByType(productType)
    const { data } = await query.graph({
      entity: "product",
      fields,
      filters: {
        id: input.product_ids,
      },
    })
    const products = asSearchDocuments(data as Record<string, unknown>[])
    const indexableProducts = products.filter(
      (product) => !product["status"] || product["status"] === "published"
    )
    const indexableIds = new Set(indexableProducts.map((product) => product.id))
    const deletedIds = input.product_ids.filter(
      (productId) => !indexableIds.has(productId)
    )

    await Promise.all(
      indexes.flatMap((index) => [
        ...(indexableProducts.length
          ? [
              meilisearch.addDocuments(index, indexableProducts, productType, {
                container,
              }),
            ]
          : []),
        ...(deletedIds.length
          ? [meilisearch.deleteDocuments(index, deletedIds)]
          : []),
      ])
    )

    result.products_upserted = indexableProducts.length
    result.products_deleted = deletedIds.length
  }

  return result
}

export const reconcileBrandSearchProjectionStep = createStep(
  "reconcile-brand-search-projection",
  async (input: BrandSearchProjectionTargets, { container }) =>
    new StepResponse(await reconcileBrandSearchProjection(input, container))
)
