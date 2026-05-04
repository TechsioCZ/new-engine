import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"
import {
  STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
  STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
  StoreCatalogProductsSchema,
} from "./validators"

export const storeCatalogProductsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/catalog/products",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreCatalogProductsSchema, {
        defaults: STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        allowed: STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({
        status: ProductStatus.PUBLISHED,
      }),
    ],
  },
]
