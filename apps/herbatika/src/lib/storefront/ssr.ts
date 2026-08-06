import { assertServerOnly } from "@/lib/server-guard"

import { prefetchBrandPageStorefrontData as prefetchBrandPageStorefrontDataValue } from "./ssr/prefetch-brand"
import { prefetchCategoryPageStorefrontData as prefetchCategoryPageStorefrontDataValue } from "./ssr/prefetch-category"
import { prefetchHomePageStorefrontData as prefetchHomePageStorefrontDataValue } from "./ssr/prefetch-home"
import { prefetchProductDetailPageStorefrontData as prefetchProductDetailPageStorefrontDataValue } from "./ssr/prefetch-product"
import { prefetchSearchPageStorefrontData as prefetchSearchPageStorefrontDataValue } from "./ssr/prefetch-search"

assertServerOnly("storefront/ssr")

export const prefetchBrandPageStorefrontData =
  prefetchBrandPageStorefrontDataValue
export const prefetchCategoryPageStorefrontData =
  prefetchCategoryPageStorefrontDataValue
export const prefetchHomePageStorefrontData =
  prefetchHomePageStorefrontDataValue
export const prefetchProductDetailPageStorefrontData =
  prefetchProductDetailPageStorefrontDataValue
export const prefetchSearchPageStorefrontData =
  prefetchSearchPageStorefrontDataValue
