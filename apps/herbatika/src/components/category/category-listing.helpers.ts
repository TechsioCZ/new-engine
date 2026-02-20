import { resolveErrorMessage } from "@/lib/storefront/error-utils";

export { resolveErrorMessage };
export {
  normalizeCategoryName,
  resolveCategoryRank,
  resolveProductCurrencyCode,
  resolveProductInStock,
  resolveProductPriceAmount,
} from "./category-product-utils";
export {
  buildPriceBandDefinitions,
  formatAmount,
  formatPriceBandLabel,
  matchesPriceBand,
} from "./category-price-utils";
export {
  buildFacetChipItems,
  toggleSelection,
  type CategoryFacetChipItem,
} from "./category-selection-utils";
