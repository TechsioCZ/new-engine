import { validateAndTransformBody } from "@medusajs/framework"
import type { MiddlewareRoute } from "@medusajs/framework/http"

import {
  AdminSearchProfileInputSchema,
  AdminSearchProfileSyncSchema,
  AdminSearchProfileTestSchema,
} from "./validators"

export const adminSearchProfileRoutesMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/search-profiles",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSearchProfileInputSchema)],
  },
  {
    matcher: "/admin/search-profiles/sync",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSearchProfileSyncSchema)],
  },
  {
    matcher: "/admin/search-profiles/:id",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSearchProfileInputSchema)],
  },
  {
    matcher: "/admin/search-profiles/:id/sync",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSearchProfileSyncSchema)],
  },
  {
    matcher: "/admin/search-profiles/:id/test",
    methods: ["POST"],
    middlewares: [validateAndTransformBody(AdminSearchProfileTestSchema)],
  },
]
