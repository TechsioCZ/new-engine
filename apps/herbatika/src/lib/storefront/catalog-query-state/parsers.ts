import {
  createParser,
  parseAsFloat,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server"
import type { inferParserType } from "nuqs/server"

import { PRODUCT_SORT_VALUES } from "../plp-config"
import { normalizeStatusFilterInput } from "./status-filters"
import { areStringArraysEqual, normalizeMultiValueInput } from "./utils"

const parseAsCsvStringArray = createParser<string[]>({
  eq: areStringArraysEqual,
  parse: (value) => normalizeMultiValueInput(value.split(",")),
  serialize: (value) => normalizeMultiValueInput(value).join(","),
}).withDefault([])
const parseAsStatusStringArray = createParser<string[]>({
  eq: areStringArraysEqual,
  parse: (value) => normalizeStatusFilterInput(value.split(",")),
  serialize: (value) => normalizeStatusFilterInput(value).join(","),
}).withDefault([])

export const catalogQueryParsers = {
  brand: parseAsCsvStringArray,
  form: parseAsCsvStringArray,
  ingredient: parseAsCsvStringArray,
  page: parseAsInteger.withDefault(1),
  price_max: parseAsFloat,
  price_min: parseAsFloat,
  q: parseAsString.withDefault(""),
  sort: parseAsStringLiteral(PRODUCT_SORT_VALUES).withDefault("recommended"),
  status: parseAsStatusStringArray,
}

export type CatalogQueryState = inferParserType<typeof catalogQueryParsers>
export type CatalogQueryStatePatch = Partial<CatalogQueryState>

export const CATALOG_PAGE_RESET_KEYS: readonly (keyof CatalogQueryState)[] = [
  "q",
  "sort",
  "status",
  "form",
  "brand",
  "ingredient",
  "price_min",
  "price_max",
]

export type SearchParamValue = string | string[] | undefined
type CatalogPageResetMode = "auto" | "always" | "never"

export interface ResolveCatalogQueryStatePatchOptions {
  resetPage?: CatalogPageResetMode
}
