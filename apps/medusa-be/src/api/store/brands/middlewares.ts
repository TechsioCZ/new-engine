import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"
import { StoreBrandsDetailProductsSchema } from "./[id]/products/route"
import { StoreBrandsDetailSchema } from "./[id]/route"
import { StoreBrandsSchema } from "./route"

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
      validateAndTransformQuery(StoreBrandsDetailProductsSchema, {
        defaults: ["id", "title", "handle", "thumbnail"],
        allowed: listProductQueryConfig.defaults,
        isList: true,
      }),
    ],
  },
]
