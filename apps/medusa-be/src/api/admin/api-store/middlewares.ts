import type { MiddlewareRoute } from "@medusajs/framework/http"
import {
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"

import {
  GetAdminApiStoreSchema,
  PostAdminApiStoreByIdSchema,
  PostAdminApiStoreSchema,
} from "./validators"

export const adminApiStoreRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/api-store",
    methods: ["GET"],
    middlewares: [
      validateAndTransformQuery(GetAdminApiStoreSchema, { isList: true }),
    ],
  },
  {
    matcher: "/admin/api-store",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminApiStoreSchema)],
  },
  {
    matcher: "/admin/api-store/:id",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(PostAdminApiStoreByIdSchema)],
  },
]
