import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
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
      validateAndTransformQuery(StoreCatalogProductsSchema, {
        defaults: STORE_CATALOG_PRODUCTS_DEFAULT_FIELDS,
        allowed: STORE_CATALOG_PRODUCTS_ALLOWED_FIELDS,
        isList: true,
      }),
    ],
  },
]
