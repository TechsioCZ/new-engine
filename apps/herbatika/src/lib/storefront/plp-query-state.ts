import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs";
import { PRODUCT_SORT_VALUES } from "./plp-config";

export {
  parsePlpQueryStateFromSearchParams,
  PLP_PAGE_SIZE,
  PRODUCT_SORT_OPTIONS,
  PRODUCT_SORT_VALUES,
  resolveProductSortOrder,
} from "./plp-config";
export type { PlpQueryState, ProductSortValue } from "./plp-config";

export const plpQueryParsers = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(PRODUCT_SORT_VALUES).withDefault("recommended"),
  q: parseAsString.withDefault(""),
};

export type NuqsPlpQueryState = inferParserType<typeof plpQueryParsers>;
