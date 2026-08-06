"use client"

import type { CatalogFacets } from "@techsio/storefront-data/catalog/types"
import { useTranslations } from "next-intl"
import { isCatalogStatusFilterSupported } from "@/lib/storefront/catalog-query-state/status-filters"
import type { NuqsPlpQueryState } from "@/lib/storefront/plp-query-state"
import { buildFacetChipItems } from "./category-selection-utils"

type UseCategoryFacetItemsProps = {
  catalogFacets: CatalogFacets
  queryState: NuqsPlpQueryState
  seedFacets: CatalogFacets
}

const STATUS_LABEL_KEYS: Readonly<Record<string, string>> = {
  action: "filters.status.action",
  "in-stock": "filters.status.in_stock",
  new: "filters.status.new",
  tip: "filters.status.tip",
  vegan: "filters.status.vegan",
}

const FORM_LABEL_KEYS: Readonly<Record<string, string>> = {
  "form-capsules": "filters.form_values.capsules",
  "form-drink": "filters.form_values.drink",
  "form-drops": "filters.form_values.drops",
  "form-liquid": "filters.form_values.liquid",
  "form-powder": "filters.form_values.powder",
  "form-softgel": "filters.form_values.softgel",
  "form-spray": "filters.form_values.spray",
  "form-syrup": "filters.form_values.syrup",
  "form-tablets": "filters.form_values.tablets",
}

export function useCategoryFacetItems({
  catalogFacets,
  queryState,
  seedFacets,
}: UseCategoryFacetItemsProps) {
  const t = useTranslations("catalog")
  const asideStatusItems = buildFacetChipItems(
    catalogFacets.status.filter((item) =>
      isCatalogStatusFilterSupported(item.id)
    ),
    seedFacets.status.filter((item) => isCatalogStatusFilterSupported(item.id)),
    queryState.status.filter(isCatalogStatusFilterSupported)
  ).map((item) => {
    const labelKey = STATUS_LABEL_KEYS[item.id]

    return {
      ...item,
      label: labelKey ? t(labelKey) : item.label,
    }
  })

  const asideFormItems = buildFacetChipItems(
    catalogFacets.form,
    seedFacets.form,
    queryState.form
  ).map((item) => {
    const labelKey = FORM_LABEL_KEYS[item.id]

    return {
      ...item,
      label: labelKey ? t(labelKey) : item.label,
    }
  })

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
