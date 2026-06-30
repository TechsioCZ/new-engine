"use client"

import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import { isCatalogStatusFilterSupported } from "@/lib/storefront/catalog-query-state/status-filters"
import type { NuqsPlpQueryState } from "@/lib/storefront/plp-query-state"
import { buildFacetChipItems } from "./category-selection-utils"

type UseCategoryFacetItemsProps = {
  catalogFacets: CatalogFacets
  queryState: NuqsPlpQueryState
  seedFacets: CatalogFacets
}

export function useCategoryFacetItems({
  catalogFacets,
  queryState,
  seedFacets,
}: UseCategoryFacetItemsProps) {
  const asideStatusItems = buildFacetChipItems(
    catalogFacets.status.filter((item) =>
      isCatalogStatusFilterSupported(item.id)
    ),
    seedFacets.status.filter((item) => isCatalogStatusFilterSupported(item.id)),
    queryState.status.filter(isCatalogStatusFilterSupported)
  )

  const asideFormItems = buildFacetChipItems(
    catalogFacets.form,
    seedFacets.form,
    queryState.form
  )

  const asideBrandItems = buildFacetChipItems(
    catalogFacets.brand,
    seedFacets.brand,
    queryState.brand
  )

  const asideIngredientItems = buildFacetChipItems(
    catalogFacets.ingredient,
    seedFacets.ingredient,
    queryState.ingredient
  )

  return {
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
  }
}
