import { validateAndTransformQuery } from "@medusajs/framework"
import { applyDefaultFilters, authenticate } from "@medusajs/framework/http"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { ProductStatus } from "@medusajs/framework/utils"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"
import { filterByValidSalesChannels } from "@medusajs/medusa/api/utils/middlewares/products/filter-by-valid-sales-channels"

import {
  StoreBrandsDetailProductsSchema,
  StoreBrandsDetailSchema,
  StoreBrandsSchema,
} from "./validators"

export const storeBrandsRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/brands",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreBrandsSchema, {
        allowed: ["id", "title", "handle"],
        defaults: ["id", "title", "handle"],
        isList: true,
      }),
    ],
  },
  {
    matcher: "/store/brands/:id",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreBrandsDetailSchema, {
        allowed: [
          "id",
          "title",
          "handle",
          "attributes.attributeType.name",
          "attributes.value",
        ],
        defaults: [
          "id",
          "title",
          "handle",
          "attributes.attributeType.name",
          "attributes.value",
        ],
        isList: false,
      }),
    ],
  },
  {
    matcher: "/store/brands/:id/products",
    methods: ["GET"],
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreBrandsDetailProductsSchema, {
        allowed: listProductQueryConfig.defaults,
        defaults: ["id", "title", "handle", "thumbnail"],
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({
        status: ProductStatus.PUBLISHED,
      }),
    ],
  },
]
