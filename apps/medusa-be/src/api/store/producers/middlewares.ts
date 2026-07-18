import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { listProductQueryConfig } from "@medusajs/medusa/api/store/products/query-config"

import { StoreProducersDetailProductsSchema } from "./[id]/products/route"
import { StoreProducersDetailSchema } from "./[id]/route"
import { StoreProducersSchema } from "./route"

export const storeProducersRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/producers",
    middlewares: [
      validateAndTransformQuery(StoreProducersSchema, {
        defaults: ["id", "title", "handle"],
        allowed: ["id", "title", "handle"],
        isList: true,
      }),
    ],
  },
  {
    methods: ["GET"],
    matcher: "/store/producers/:id",
    middlewares: [
      validateAndTransformQuery(StoreProducersDetailSchema, {
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
    matcher: "/store/producers/:id/products",
    middlewares: [
      validateAndTransformQuery(StoreProducersDetailProductsSchema, {
        defaults: ["id", "title", "handle", "thumbnail"],
        allowed: listProductQueryConfig.defaults,
        isList: true,
      }),
    ],
  },
]
