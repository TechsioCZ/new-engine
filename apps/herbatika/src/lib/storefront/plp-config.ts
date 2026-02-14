export const PRODUCT_SORT_VALUES = [
  "recommended",
  "newest",
  "oldest",
  "title-asc",
  "title-desc",
] as const;

export type ProductSortValue = (typeof PRODUCT_SORT_VALUES)[number];

export type PlpQueryState = {
  page: number;
  sort: ProductSortValue;
  q: string;
};

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

export const PLP_PAGE_SIZE = 12;

type SearchParamValue = string | string[] | undefined;

const getFirstSearchParamValue = (value: SearchParamValue): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }

  return null;
};

export const parsePlpQueryStateFromSearchParams = (
  searchParams: Record<string, SearchParamValue> | undefined,
): PlpQueryState => {
  const pageValue = getFirstSearchParamValue(searchParams?.page);
  const parsedPage = pageValue ? Number.parseInt(pageValue, 10) : Number.NaN;

  const sortValue = getFirstSearchParamValue(searchParams?.sort);
  const qValue = getFirstSearchParamValue(searchParams?.q) ?? "";

  return {
    page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    sort:
      sortValue && PRODUCT_SORT_VALUES.includes(sortValue as ProductSortValue)
        ? (sortValue as ProductSortValue)
        : "recommended",
    q: qValue,
  };
};

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
