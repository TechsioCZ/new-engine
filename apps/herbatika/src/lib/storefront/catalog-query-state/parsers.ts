import {
  createParser,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs/server";
import { PRODUCT_SORT_VALUES } from "../plp-config";
import { areStringArraysEqual, normalizeMultiValueInput } from "./utils";

const parseAsCsvStringArray = createParser<string[]>({
  parse: (value) => normalizeMultiValueInput(value.split(",")),
  serialize: (value) => normalizeMultiValueInput(value).join(","),
  eq: areStringArraysEqual,
}).withDefault([]);

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

export const CATALOG_PAGE_RESET_KEYS: ReadonlyArray<keyof CatalogQueryState> = [
  "q",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
];

export type SearchParamValue = string | string[] | undefined;
export type CatalogPageResetMode = "auto" | "always" | "never";

export type ResolveCatalogQueryStatePatchOptions = {
  resetPage?: CatalogPageResetMode;
};
