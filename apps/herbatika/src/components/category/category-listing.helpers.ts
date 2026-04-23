import { resolveErrorMessage } from "@/lib/storefront/error-utils";

export { resolveErrorMessage };
export {
  normalizeCategoryName,
  resolveCategoryRank,
  resolveProductCurrencyCode,
  resolveProductInStock,
  resolveProductPriceAmount,
} from "@/lib/storefront/category-utils";
export { toggleSelection } from "@/lib/storefront/selection-utils";
export {
  buildPriceBandDefinitions,
  formatAmount,
  formatPriceBandLabel,
  matchesPriceBand,
} from "./category-price-utils";
export {
  buildFacetChipItems,
  type CategoryFacetChipItem,
} from "./category-selection-utils";
