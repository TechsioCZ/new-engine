import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs";

export const PRODUCT_SORT_VALUES = [
  "recommended",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
] as const;

export type ProductSortValue = (typeof PRODUCT_SORT_VALUES)[number];

export const PRODUCT_SORT_OPTIONS: Array<{
  label: string;
  value: ProductSortValue;
}> = [
  { label: "Odporúčané", value: "recommended" },
  { label: "Najnovšie", value: "newest" },
  { label: "Najstaršie", value: "oldest" },
  { label: "Názov A-Z", value: "title-asc" },
  { label: "Názov Z-A", value: "title-desc" },
];

export const plpQueryParsers = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsStringLiteral(PRODUCT_SORT_VALUES).withDefault("recommended"),
  q: parseAsString.withDefault(""),
};

export type PlpQueryState = inferParserType<typeof plpQueryParsers>;

export const PLP_PAGE_SIZE = 12;

export const resolveProductSortOrder = (
  sort: ProductSortValue,
): string | undefined => {
  switch (sort) {
    case "newest":
      return "-created_at";
    case "oldest":
      return "created_at";
    case "title-asc":
      return "title";
    case "title-desc":
      return "-title";
    default:
      return undefined;
  }
};
