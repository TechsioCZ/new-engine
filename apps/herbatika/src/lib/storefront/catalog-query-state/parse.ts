import { catalogQueryParsers } from "./parsers"
import type { CatalogQueryState, SearchParamValue } from "./parsers"

export const parseCatalogQueryStateFromSearchParams = (
  searchParams: Record<string, SearchParamValue> | undefined,
): CatalogQueryState => ({
  brand: catalogQueryParsers.brand.parseServerSide(searchParams?.brand),
  form: catalogQueryParsers.form.parseServerSide(searchParams?.form),
  ingredient: catalogQueryParsers.ingredient.parseServerSide(
    searchParams?.ingredient,
  ),
  page: catalogQueryParsers.page.parseServerSide(searchParams?.page),
  price_max: catalogQueryParsers.price_max.parseServerSide(
    searchParams?.price_max,
  ),
  price_min: catalogQueryParsers.price_min.parseServerSide(
    searchParams?.price_min,
  ),
  q: catalogQueryParsers.q.parseServerSide(searchParams?.q),
  sort: catalogQueryParsers.sort.parseServerSide(searchParams?.sort),
  status: catalogQueryParsers.status.parseServerSide(searchParams?.status),
})
