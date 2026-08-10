import type { MedusaCatalogProduct } from "@techsio/storefront-data/catalog/medusa-service"

import type { ProductSectionDefinition } from "./homepage.data"

export type HomepageProductSection = ProductSectionDefinition & {
  products: MedusaCatalogProduct[]
}
