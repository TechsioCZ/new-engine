"use client";

import type { CatalogFacets } from "@techsio/storefront-data/catalog/types";
import { useMemo } from "react";
import type { NuqsPlpQueryState } from "@/lib/storefront/plp-query-state";
import { buildFacetChipItems } from "./category-selection-utils";

type UseCategoryFacetItemsProps = {
  catalogFacets: CatalogFacets;
  queryState: NuqsPlpQueryState;
  seedFacets: CatalogFacets;
};

export function useCategoryFacetItems({
  catalogFacets,
  queryState,
  seedFacets,
}: UseCategoryFacetItemsProps) {
  const asideStatusItems = useMemo(
    () =>
      buildFacetChipItems(
        catalogFacets.status,
        seedFacets.status,
        queryState.status,
      ),
    [catalogFacets.status, queryState.status, seedFacets.status],
  );

  const asideFormItems = useMemo(
    () =>
      buildFacetChipItems(catalogFacets.form, seedFacets.form, queryState.form),
    [catalogFacets.form, queryState.form, seedFacets.form],
  );

  const asideBrandItems = useMemo(
    () =>
      buildFacetChipItems(
        catalogFacets.brand,
        seedFacets.brand,
        queryState.brand,
      ),
    [catalogFacets.brand, queryState.brand, seedFacets.brand],
  );

  const asideIngredientItems = useMemo(
    () =>
      buildFacetChipItems(
        catalogFacets.ingredient,
        seedFacets.ingredient,
        queryState.ingredient,
      ),
    [catalogFacets.ingredient, queryState.ingredient, seedFacets.ingredient],
  );

  return {
    asideBrandItems,
    asideFormItems,
    asideIngredientItems,
    asideStatusItems,
  };
}
