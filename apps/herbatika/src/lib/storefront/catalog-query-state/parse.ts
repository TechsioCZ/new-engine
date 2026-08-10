import { createLoader } from "nuqs/server"

import { catalogQueryParsers } from "./parsers"
import type { CatalogQueryState, SearchParamValue } from "./parsers"

const loadCatalogQueryState = createLoader(catalogQueryParsers)

export const parseCatalogQueryStateFromSearchParams = (
  searchParams: Record<string, SearchParamValue> | undefined,
): CatalogQueryState => loadCatalogQueryState(searchParams ?? {})
