import { PLP_PAGE_SIZE } from "../plp-config";
import type { CatalogQueryState } from "./parsers";
import { normalizePriceRange, toNonEmptyArray } from "./utils";

type BuildCatalogProductsParamsInput = {
  queryState: CatalogQueryState;
  categoryIds?: string[];
  limit?: number;
  regionId?: string;
  countryCode?: string;
  currencyCode?: string;
};

export type CatalogProductsParams = {
  q?: string;
  page: number;
  limit: number;
  sort: CatalogQueryState["sort"];
  category_id?: string[];
  status?: string[];
  form?: string[];
  brand?: string[];
  ingredient?: string[];
  price_min?: number;
  price_max?: number;
  region_id?: string;
  country_code?: string;
  currency_code?: string;
};

export const buildCatalogProductsParams = ({
  queryState,
  categoryIds,
  limit = PLP_PAGE_SIZE,
  regionId,
  countryCode,
  currencyCode,
}: BuildCatalogProductsParamsInput): CatalogProductsParams => {
  const normalizedSearchQuery = queryState.q.trim();
  const normalizedPriceRange = normalizePriceRange(
    queryState.price_min,
    queryState.price_max,
  );

  return {
    q: normalizedSearchQuery || undefined,
    page: queryState.page,
    limit,
    sort: queryState.sort,
    category_id: toNonEmptyArray(categoryIds ?? []),
    status: toNonEmptyArray(queryState.status),
    form: toNonEmptyArray(queryState.form),
    brand: toNonEmptyArray(queryState.brand),
    ingredient: toNonEmptyArray(queryState.ingredient),
    price_min: normalizedPriceRange.min,
    price_max: normalizedPriceRange.max,
    region_id: regionId || undefined,
    country_code: countryCode || undefined,
    currency_code: currencyCode || undefined,
  };
};

export const resolveCatalogActiveFilterCount = (
  queryState: CatalogQueryState,
): number => {
  const normalizedPriceRange = normalizePriceRange(
    queryState.price_min,
    queryState.price_max,
  );

  return (
    (normalizedPriceRange.min !== undefined ||
    normalizedPriceRange.max !== undefined
      ? 1
      : 0) +
    queryState.status.length +
    queryState.form.length +
    queryState.brand.length +
    queryState.ingredient.length
  );
};
