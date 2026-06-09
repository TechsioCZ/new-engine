import {
  catalogQueryParsers,
  type CatalogQueryState,
  type SearchParamValue,
} from "./parsers";

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
