// Pages Router rejects the App-Router-only `server-only` marker. This surface
// is server-only by convention and build-time import inventory.

import { prefetchBrandPageStorefrontData as prefetchBrandPageStorefrontDataValue } from "./ssr/prefetch-brand"
import { prefetchCategoryPageStorefrontData as prefetchCategoryPageStorefrontDataValue } from "./ssr/prefetch-category"
import { prefetchHomePageStorefrontData as prefetchHomePageStorefrontDataValue } from "./ssr/prefetch-home"
import { prefetchProductDetailPageStorefrontData as prefetchProductDetailPageStorefrontDataValue } from "./ssr/prefetch-product"
import { prefetchProductIndexStorefrontData as prefetchProductIndexStorefrontDataValue } from "./ssr/prefetch-product-index"
import { prefetchSearchPageStorefrontData as prefetchSearchPageStorefrontDataValue } from "./ssr/prefetch-search"

export const prefetchBrandPageStorefrontData =
  prefetchBrandPageStorefrontDataValue
export const prefetchCategoryPageStorefrontData =
  prefetchCategoryPageStorefrontDataValue
export const prefetchHomePageStorefrontData =
  prefetchHomePageStorefrontDataValue
export const prefetchProductDetailPageStorefrontData =
  prefetchProductDetailPageStorefrontDataValue
export const prefetchProductIndexStorefrontData =
  prefetchProductIndexStorefrontDataValue
export const prefetchSearchPageStorefrontData =
  prefetchSearchPageStorefrontDataValue
