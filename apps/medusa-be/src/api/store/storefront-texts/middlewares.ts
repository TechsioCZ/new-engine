import { validateAndTransformQuery } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"
import { StoreGetStorefrontTextsSchema } from "./validators"

export const storeStorefrontTextRoutesMiddlewares: MiddlewareRoute[] = [
  {
    methods: ["GET"],
    matcher: "/store/storefront-texts",
    middlewares: [
      validateAndTransformQuery(StoreGetStorefrontTextsSchema, {
        isList: false,
      }),
    ],
  },
]
