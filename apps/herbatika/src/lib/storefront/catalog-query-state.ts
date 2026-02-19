import {
  createParser,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import {
  PLP_PAGE_SIZE,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_SORT_VALUES,
  resolveProductSortOrder,
} from "./plp-config";

export { PLP_PAGE_SIZE, PRODUCT_SORT_OPTIONS, PRODUCT_SORT_VALUES, resolveProductSortOrder };
export type { ProductSortValue } from "./plp-config";

const MAX_MULTI_VALUE_ITEMS = 40;

type SearchParamValue = string | string[] | undefined;

const normalizeMultiValueInput = (values: string[]): string[] => {
  const normalizedValues: string[] = [];
  const seenValues = new Set<string>();

  for (const value of values) {
    const normalizedValue = value.trim();
    if (!normalizedValue || seenValues.has(normalizedValue)) {
      continue;
    }

    seenValues.add(normalizedValue);
    normalizedValues.push(normalizedValue);

    if (normalizedValues.length >= MAX_MULTI_VALUE_ITEMS) {
      break;
    }
  }

  return normalizedValues;
};

const areStringArraysEqual = (left: string[], right: string[]) => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
};

const parseAsCsvStringArray = createParser<string[]>({
  parse: (value) => normalizeMultiValueInput(value.split(",")),
  serialize: (value) => normalizeMultiValueInput(value).join(","),
  eq: areStringArraysEqual,
}).withDefault([]);

const normalizeNonNegativeNumber = (
  value: number | null,
): number | undefined => {
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return undefined;
  }

  return value;
};

const normalizePriceRange = (
  minValue: number | null,
  maxValue: number | null,
): { min?: number; max?: number } => {
  let normalizedMin = normalizeNonNegativeNumber(minValue);
  let normalizedMax = normalizeNonNegativeNumber(maxValue);

  if (
    normalizedMin !== undefined &&
    normalizedMax !== undefined &&
    normalizedMin > normalizedMax
  ) {
    const originalMin = normalizedMin;
    normalizedMin = normalizedMax;
    normalizedMax = originalMin;
  }

  return {
    min: normalizedMin,
    max: normalizedMax,
  };
};

const toNonEmptyArray = (values: string[]): string[] | undefined => {
  const normalizedValues = normalizeMultiValueInput(values);
  if (normalizedValues.length === 0) {
    return undefined;
  }

  return normalizedValues;
};

export const catalogQueryParsers = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(PRODUCT_SORT_VALUES).withDefault("recommended"),
  q: parseAsString.withDefault(""),
  status: parseAsCsvStringArray,
  form: parseAsCsvStringArray,
  brand: parseAsCsvStringArray,
  ingredient: parseAsCsvStringArray,
  price_min: parseAsFloat,
  price_max: parseAsFloat,
};

export type CatalogQueryState = inferParserType<typeof catalogQueryParsers>;
export type CatalogQueryStatePatch = Partial<CatalogQueryState>;

const CATALOG_PAGE_RESET_KEYS: ReadonlyArray<keyof CatalogQueryState> = [
  "q",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
];

const hasOwnKey = <T extends object>(
  value: T,
  key: PropertyKey,
): key is keyof T => {
  return Object.prototype.hasOwnProperty.call(value, key);
};

const areCatalogQueryValuesEqual = (
  left: CatalogQueryState[keyof CatalogQueryState],
  right: CatalogQueryState[keyof CatalogQueryState],
) => {
  if (Array.isArray(left) && Array.isArray(right)) {
    return areStringArraysEqual(left, right);
  }

  if (typeof left === "number" && typeof right === "number") {
    return Number.isNaN(left) ? Number.isNaN(right) : left === right;
  }

  return left === right;
};

type CatalogPageResetMode = "auto" | "always" | "never";

type ResolveCatalogQueryStatePatchOptions = {
  resetPage?: CatalogPageResetMode;
};

export const resolveCatalogQueryStatePatch = (
  currentState: CatalogQueryState,
  patch: CatalogQueryStatePatch,
  options: ResolveCatalogQueryStatePatchOptions = {},
): CatalogQueryStatePatch => {
  const resetMode = options.resetPage ?? "auto";

  if (resetMode === "never" || hasOwnKey(patch, "page")) {
    return patch;
  }

  if (resetMode === "always") {
    return currentState.page === 1 ? patch : { ...patch, page: 1 };
  }

  const shouldResetPage = CATALOG_PAGE_RESET_KEYS.some((key) => {
    if (!hasOwnKey(patch, key)) {
      return false;
    }

    const nextValue = patch[key];
    if (nextValue === undefined) {
      return false;
    }

    return !areCatalogQueryValuesEqual(currentState[key], nextValue);
  });

  if (!shouldResetPage || currentState.page === 1) {
    return patch;
  }

  return {
    ...patch,
    page: 1,
  };
};

export const parseCatalogQueryStateFromSearchParams = (
  searchParams: Record<string, SearchParamValue> | undefined,
): CatalogQueryState => {
  return {
    page: catalogQueryParsers.page.parseServerSide(searchParams?.page),
    sort: catalogQueryParsers.sort.parseServerSide(searchParams?.sort),
    q: catalogQueryParsers.q.parseServerSide(searchParams?.q),
    status: catalogQueryParsers.status.parseServerSide(searchParams?.status),
    form: catalogQueryParsers.form.parseServerSide(searchParams?.form),
    brand: catalogQueryParsers.brand.parseServerSide(searchParams?.brand),
    ingredient: catalogQueryParsers.ingredient.parseServerSide(
      searchParams?.ingredient,
    ),
    price_min: catalogQueryParsers.price_min.parseServerSide(
      searchParams?.price_min,
    ),
    price_max: catalogQueryParsers.price_max.parseServerSide(
      searchParams?.price_max,
    ),
  };
};

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
