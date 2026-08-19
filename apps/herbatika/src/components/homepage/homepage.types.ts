import type { HttpTypes } from "@medusajs/types"
import type { PublicEntitySlugMap } from "@/lib/storefront/ssr/public-entity-projection-map"
import type { ProductSectionDefinition } from "./homepage.data"

export type HomepageProductSection = ProductSectionDefinition & {
  productPublicSlugsById: PublicEntitySlugMap
  products: HttpTypes.StoreProduct[]
  sourceCategoryId?: string
}
