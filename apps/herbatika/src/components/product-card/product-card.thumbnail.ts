import type { MedusaCatalogProduct } from "@techsio/storefront-data/catalog/medusa-service"

import { PRODUCT_FALLBACK_IMAGE } from "./product-card.constants"

export const resolveThumbnail = (product: MedusaCatalogProduct): string =>
  product.thumbnail ?? PRODUCT_FALLBACK_IMAGE
