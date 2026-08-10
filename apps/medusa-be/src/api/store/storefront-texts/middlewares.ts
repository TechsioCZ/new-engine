import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import { StoreGetStorefrontTextsSchema } from "./validators"

export const storeStorefrontTextRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/storefront-texts",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(StoreGetStorefrontTextsSchema, {
        isList: false,
      }),
    ],
  },
]
