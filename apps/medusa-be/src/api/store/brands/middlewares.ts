import { validateAndTransformQuery } from "@medusajs/framework"
import {
  applyDefaultFilters,
  authenticate,
  type MiddlewareRoute,
} from "@medusajs/framework/http"
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
    methods: ["GET"],
    matcher: "/store/brands",
    middlewares: [
      validateAndTransformQuery(StoreBrandsSchema, {
        defaults: ["id", "title", "handle"],
        allowed: ["id", "title", "handle"],
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/brands/:id",
    middlewares: [
      validateAndTransformQuery(StoreBrandsDetailSchema, {
        defaults: [
          "id",
          "title",
          "handle",
          "attributes.attributeType.name",
          "attributes.value",
        ],
        allowed: [
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
    methods: ["GET"],
    matcher: "/store/brands/:id/products",
    middlewares: [
      authenticate("customer", ["session", "bearer"], {
        allowUnauthenticated: true,
      }),
      validateAndTransformQuery(StoreBrandsDetailProductsSchema, {
        defaults: ["id", "title", "handle", "thumbnail"],
        allowed: listProductQueryConfig.defaults,
        isList: true,
      }),
      filterByValidSalesChannels(),
      applyDefaultFilters({
        status: ProductStatus.PUBLISHED,
      }),
    ],
  },
]
