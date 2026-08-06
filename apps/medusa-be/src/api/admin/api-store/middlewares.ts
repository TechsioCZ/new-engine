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
    methods: ["GET"],
    matcher: "/admin/api-store",
    middlewares: [
      validateAndTransformQuery(GetAdminApiStoreSchema, { isList: true }),
    ],
  },
  {
    methods: ["POST"],
    matcher: "/admin/api-store",
    middlewares: [validateAndTransformBody(PostAdminApiStoreSchema)],
  },
  {
    methods: ["POST"],
    matcher: "/admin/api-store/:id",
    middlewares: [validateAndTransformBody(PostAdminApiStoreByIdSchema)],
  },
]
